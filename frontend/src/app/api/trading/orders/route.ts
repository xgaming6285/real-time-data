import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Account from '@/models/Account';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get user ID from token
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET - Fetch all orders (optionally filter by status)
export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'open', 'closed', 'all'

    await dbConnect();
    
    const query: { userId: string; status?: string } = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST - Create new order
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { symbol, type, volume, entryPrice, stopLoss, takeProfit } = body;

    // Validation
    if (!symbol || !type || !volume || !entryPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, type, volume, entryPrice' },
        { status: 400 }
      );
    }

    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "buy" or "sell"' },
        { status: 400 }
      );
    }

    if (volume < 0.01) {
      return NextResponse.json(
        { error: 'Minimum volume is 0.01 lots' },
        { status: 400 }
      );
    }

    // Validate Stop Loss and Take Profit
    if (stopLoss !== null && stopLoss !== undefined) {
      if (type === 'buy' && stopLoss >= entryPrice) {
        return NextResponse.json(
          { error: 'For BUY orders, Stop Loss must be below entry price' },
          { status: 400 }
        );
      }
      if (type === 'sell' && stopLoss <= entryPrice) {
        return NextResponse.json(
          { error: 'For SELL orders, Stop Loss must be above entry price' },
          { status: 400 }
        );
      }
    }

    if (takeProfit !== null && takeProfit !== undefined) {
      if (type === 'buy' && takeProfit <= entryPrice) {
        return NextResponse.json(
          { error: 'For BUY orders, Take Profit must be above entry price' },
          { status: 400 }
        );
      }
      if (type === 'sell' && takeProfit >= entryPrice) {
        return NextResponse.json(
          { error: 'For SELL orders, Take Profit must be below entry price' },
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
    // Margin = (Volume * Lot Size * Price) / Leverage
    const lotSize = 100000; // Standard forex lot
    const requiredMargin = (volume * lotSize * entryPrice) / account.leverage;
    
    if (requiredMargin > account.freeMargin) {
      return NextResponse.json(
        { error: 'Insufficient margin. Required: ' + requiredMargin.toFixed(2) + ', Available: ' + account.freeMargin.toFixed(2) },
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
      status: 'open',
      profit: 0,
      margin: requiredMargin,
    });

    // Update account margin
    account.margin += requiredMargin;
    account.freeMargin = account.equity - account.margin;
    account.marginLevel = account.margin > 0 ? (account.equity / account.margin) * 100 : 0;
    await account.save();

    return NextResponse.json({
      message: 'Order placed successfully',
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
    }, { status: 201 });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

