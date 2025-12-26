import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import Order from "@/models/Order";
import Account from "@/models/Account";
import {
  getContractSize,
  getCategoryFromSymbol,
  calculateDynamicMargin,
} from "@/lib/leverage";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper to get user ID from token
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) return null;

  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// Helper to get current price from MT5 backend
async function getCurrentPrice(
  symbol: string
): Promise<{ bid: number; ask: number } | null> {
  try {
    const MT5_API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const encodedSymbol = encodeURIComponent(symbol);
    const response = await fetch(`${MT5_API_URL}/quote/${encodedSymbol}`, {
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch price for ${symbol}`);
      return null;
    }

    const data = await response.json();
    return { bid: data.bid, ask: data.ask };
  } catch (error) {
    console.warn(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

// GET - Fetch all orders (optionally filter by status)
export async function GET(request: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'open', 'closed', 'all'

    await dbConnect();

    const query: { userId: string; status?: string } = { userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100);

    // Update current prices and profits for open orders
    if (status === "open" || status === "all") {
      // Get unique symbols from open orders
      const openOrders = orders.filter((order) => order.status === "open");
      const uniqueSymbols = [
        ...new Set(openOrders.map((order) => order.symbol)),
      ];

      // Fetch current prices for all symbols in parallel
      const pricePromises = uniqueSymbols.map((symbol) =>
        getCurrentPrice(symbol).then((price) => ({ symbol, price }))
      );

      const priceResults = await Promise.all(pricePromises);
      const priceMap = new Map(
        priceResults
          .filter((result) => result.price !== null)
          .map((result) => [result.symbol, result.price!])
      );

      // Update orders with current prices and profits
      for (const order of openOrders) {
        const prices = priceMap.get(order.symbol);
        if (prices) {
          const currentPrice = order.type === "buy" ? prices.bid : prices.ask;
          order.currentPrice = currentPrice;

          // Calculate profit using correct contract size
          const orderCategory = getCategoryFromSymbol(order.symbol);
          const orderContractSize = getContractSize(
            order.symbol,
            orderCategory
          );
          const priceDiff =
            order.type === "buy"
              ? currentPrice - order.entryPrice
              : order.entryPrice - currentPrice;
          order.profit = priceDiff * order.volume * orderContractSize;
        }
      }
    }

    return NextResponse.json(
      { orders },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST - Create new order
export async function POST(request: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, type, volume, entryPrice, stopLoss, takeProfit } = body;

    // Validation
    if (!symbol || !type || !volume || !entryPrice) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, type, volume, entryPrice" },
        { status: 400 }
      );
    }

    if (!["buy", "sell"].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "buy" or "sell"' },
        { status: 400 }
      );
    }

    if (volume < 0.01) {
      return NextResponse.json(
        { error: "Minimum volume is 0.01 lots" },
        { status: 400 }
      );
    }

    // Validate Stop Loss and Take Profit positions
    if (type === "buy") {
      // For BUY orders: Stop Loss must be below entry, Take Profit must be above entry
      if (stopLoss && stopLoss >= entryPrice) {
        return NextResponse.json(
          { error: "Stop Loss must be below entry price for BUY orders" },
          { status: 400 }
        );
      }
      if (takeProfit && takeProfit <= entryPrice) {
        return NextResponse.json(
          { error: "Take Profit must be above entry price for BUY orders" },
          { status: 400 }
        );
      }
    } else if (type === "sell") {
      // For SELL orders: Stop Loss must be above entry, Take Profit must be below entry
      if (stopLoss && stopLoss <= entryPrice) {
        return NextResponse.json(
          { error: "Stop Loss must be above entry price for SELL orders" },
          { status: 400 }
        );
      }
      if (takeProfit && takeProfit >= entryPrice) {
        return NextResponse.json(
          { error: "Take Profit must be below entry price for SELL orders" },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    // Get account and check margin
    let account = await Account.findOne({ userId });

    if (!account) {
      account = await Account.create({
        userId,
        balance: 10000,
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
      });
    }

    // Calculate required margin
    // 1. Get existing volume for this symbol to apply banded leverage correctly
    // This prevents the "order splitting" loophole
    const existingOrders = await Order.find({
      userId,
      symbol,
      status: "open",
    });

    const existingVolume = existingOrders.reduce(
      (sum, order) => sum + (order.volume || 0),
      0
    );

    // 2. Calculate Margin using the Banded approach
    const category = getCategoryFromSymbol(symbol);
    const contractSize = getContractSize(symbol, category);

    // Use the new banded calculation
    const requiredMargin = calculateDynamicMargin(
      symbol,
      volume,
      existingVolume,
      entryPrice,
      contractSize,
      category
    );

    // Calculate effective leverage for display/logging only
    const notionalValue = volume * contractSize * entryPrice;
    const effectiveLeverage =
      requiredMargin > 0 ? notionalValue / requiredMargin : 0;

    // Debug logging for margin calculation
    console.log(
      `[Order] Symbol: ${symbol}, Category: ${category}, Contract Size: ${contractSize}, Volume: ${volume}, Existing Vol: ${existingVolume}, Price: ${entryPrice}, Effective Lev: ~${effectiveLeverage.toFixed(
        1
      )}:1, Required Margin: ${requiredMargin.toFixed(
        2
      )}, Available: ${account.freeMargin.toFixed(2)}`
    );

    if (requiredMargin > account.freeMargin) {
      return NextResponse.json(
        {
          error:
            "Insufficient margin. Required: " +
            requiredMargin.toFixed(2) +
            ", Available: " +
            account.freeMargin.toFixed(2),
        },
        { status: 400 }
      );
    }

    // Create order
    const order = await Order.create({
      userId,
      symbol,
      type,
      volume,
      entryPrice,
      currentPrice: entryPrice,
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
      status: "open",
      profit: 0,
      margin: requiredMargin,
    });

    // Update account margin
    account.margin += requiredMargin;
    account.freeMargin = account.equity - account.margin;
    account.marginLevel =
      account.margin > 0 ? (account.equity / account.margin) * 100 : 0;
    await account.save();

    return NextResponse.json(
      {
        message: "Order placed successfully",
        order: {
          id: order._id,
          symbol: order.symbol,
          type: order.type,
          volume: order.volume,
          entryPrice: order.entryPrice,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          margin: order.margin,
          status: order.status,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
