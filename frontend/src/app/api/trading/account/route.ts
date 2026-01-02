import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import Order from '@/models/Order';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get user ID from token as ObjectId
async function getUserId(): Promise<mongoose.Types.ObjectId | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as { userId: string };
    // Convert string to ObjectId for proper MongoDB matching
    return new mongoose.Types.ObjectId(decoded.userId);
  } catch {
    return null;
  }
}

// GET - Fetch account balance and info
export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // Find or create account
    let account = await Account.findOne({ userId });
    
    if (!account) {
      // Create new account with default balance
      account = await Account.create({
        userId,
        balance: 10000,
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
      });
    }

    // Calculate current equity based on open positions
    const openOrders = await Order.find({ userId, status: 'open' });
    
    let totalProfit = 0;
    let totalMargin = 0;
    
    for (const order of openOrders) {
      totalProfit += order.profit || 0;
      totalMargin += order.margin || 0;
    }
    
    // Update equity
    account.equity = account.balance + totalProfit;
    account.margin = totalMargin;
    account.freeMargin = account.equity - totalMargin;
    account.marginLevel = totalMargin > 0 ? (account.equity / totalMargin) * 100 : 0;
    
    await account.save();

    return NextResponse.json({
      balance: account.balance,
      equity: account.equity,
      margin: account.margin,
      freeMargin: account.freeMargin,
      marginLevel: account.marginLevel,
      currency: account.currency,
      leverage: account.leverage,
      isAutoLeverage: account.isAutoLeverage ?? false,
    });
  } catch (error) {
    console.error('Account fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// POST - Initialize or reset account
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
    const { initialBalance = 10000, leverage = 30, isAutoLeverage = false } = body;

    await dbConnect();
    
    // Close all open orders first
    await Order.updateMany(
      { userId, status: 'open' },
      { status: 'cancelled', closedAt: new Date() }
    );
    
    // Reset or create account
    const account = await Account.findOneAndUpdate(
      { userId },
      {
        balance: initialBalance,
        equity: initialBalance,
        margin: 0,
        freeMargin: initialBalance,
        marginLevel: 0,
        leverage,
        isAutoLeverage,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: 'Account initialized',
      balance: account.balance,
      equity: account.equity,
      leverage: account.leverage,
      isAutoLeverage: account.isAutoLeverage ?? false,
    });
  } catch (error) {
    console.error('Account init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize account' },
      { status: 500 }
    );
  }
}

