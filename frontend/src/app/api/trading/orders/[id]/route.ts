import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import Order from "@/models/Order";
import Account from "@/models/Account";
import { getContractSize, getCategoryFromSymbol } from "@/lib/leverage";

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

// GET - Fetch single order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const order = await Order.findOne({ _id: id, userId });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PATCH - Modify order (update SL/TP)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { stopLoss, takeProfit } = body;

    await dbConnect();

    const order = await Order.findOne({ _id: id, userId, status: "open" });

    if (!order) {
      return NextResponse.json(
        { error: "Open order not found" },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (stopLoss !== undefined) order.stopLoss = stopLoss;
    if (takeProfit !== undefined) order.takeProfit = takeProfit;

    await order.save();

    return NextResponse.json({
      message: "Order updated",
      order: {
        id: order._id,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
      },
    });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// DELETE - Close order
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get close price from query or body
    const { searchParams } = new URL(request.url);
    const closePrice = parseFloat(searchParams.get("closePrice") || "0");

    if (!closePrice || closePrice <= 0) {
      return NextResponse.json(
        { error: "Close price is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const order = await Order.findOne({ _id: id, userId, status: "open" });

    if (!order) {
      return NextResponse.json(
        { error: "Open order not found" },
        { status: 404 }
      );
    }

    // Calculate final profit using correct contract size
    const priceDiff =
      order.type === "buy"
        ? closePrice - order.entryPrice
        : order.entryPrice - closePrice;

    const category = getCategoryFromSymbol(order.symbol);
    const contractSize = getContractSize(order.symbol, category);
    const profit = priceDiff * order.volume * contractSize;

    // Update order
    order.status = "closed";
    order.closePrice = closePrice;
    order.currentPrice = closePrice;
    order.profit = profit;
    order.closedAt = new Date();
    await order.save();

    // Update the correct account (use accountId from order, fallback to active account for legacy orders)
    let account;
    if (order.accountId) {
      // New orders have accountId - use it directly
      account = await Account.findById(order.accountId);
    } else {
      // Legacy orders without accountId - find active account by lastActiveAt
      const accounts = await Account.find({ userId }).sort({ lastActiveAt: -1 });
      account = accounts.length > 0 ? accounts[0] : null;
    }
    
    if (account) {
      // Add profit to balance and remove margin
      account.balance += profit;
      account.margin -= order.margin;
      account.equity = account.balance;
      account.freeMargin = account.equity - account.margin;
      account.marginLevel =
        account.margin > 0 ? (account.equity / account.margin) * 100 : 0;
      await account.save();
      console.log(`[Order Close] Updated account ${account._id} (mode: ${account.mode}): balance=${account.balance}, profit=${profit}`);
    }

    return NextResponse.json({
      message: "Order closed",
      order: {
        id: order._id,
        symbol: order.symbol,
        type: order.type,
        volume: order.volume,
        entryPrice: order.entryPrice,
        closePrice: order.closePrice,
        profit: order.profit,
        status: order.status,
        closedAt: order.closedAt,
      },
    });
  } catch (error) {
    console.error("Order close error:", error);
    return NextResponse.json(
      { error: "Failed to close order" },
      { status: 500 }
    );
  }
}
