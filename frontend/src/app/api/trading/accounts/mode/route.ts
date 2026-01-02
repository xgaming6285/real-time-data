import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import TradingAccount from '@/models/TradingAccount';
import Account from '@/models/Account';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get user ID from token as ObjectId
async function getUserId(): Promise<mongoose.Types.ObjectId | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as { userId: string };
    return new mongoose.Types.ObjectId(decoded.userId);
  } catch {
    return null;
  }
}

// GET - Get current account mode
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
    
    // Get active trading account
    let tradingAccount = await TradingAccount.findOne({ userId, isActive: true });
    if (!tradingAccount) {
      tradingAccount = await TradingAccount.findOne({ userId }).sort({ createdAt: 1 });
    }
    
    let activeMode: 'live' | 'demo' = 'live';
    
    if (tradingAccount) {
      // Find the most recently active balance
      const balances = await Account.find({ tradingAccountId: tradingAccount._id }).sort({ lastActiveAt: -1 });
      if (balances.length > 0) {
        activeMode = balances[0].mode;
      }
    }

    return NextResponse.json({
      mode: activeMode,
      availableModes: ['live', 'demo'],
      tradingAccount: tradingAccount ? {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
      } : null,
    });
  } catch (error) {
    console.error('Get account mode error:', error);
    return NextResponse.json(
      { error: 'Failed to get account mode' },
      { status: 500 }
    );
  }
}

// POST - Switch account mode (live/demo) within the active trading account
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
    const { mode } = body;

    if (!mode || !['live', 'demo'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "live" or "demo"' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Get or create active trading account
    let tradingAccount = await TradingAccount.findOne({ userId, isActive: true });
    
    if (!tradingAccount) {
      // Create a default trading account
      tradingAccount = await TradingAccount.create({
        userId,
        name: 'Main Account',
        isActive: true,
      });
    }
    
    // Find or create the balance record for the target mode
    let account = await Account.findOne({ tradingAccountId: tradingAccount._id, mode });
    
    if (!account) {
      // Create new balance for this mode
      const defaultBalance = mode === 'demo' ? 10000 : 0;
      account = await Account.create({
        tradingAccountId: tradingAccount._id,
        mode,
        balance: defaultBalance,
        equity: defaultBalance,
        margin: 0,
        freeMargin: defaultBalance,
        marginLevel: 0,
        leverage: 30,
        isAutoLeverage: false,
        lastActiveAt: new Date(),
      });
    } else {
      // Update lastActiveAt for the selected mode
      account = await Account.findOneAndUpdate(
        { tradingAccountId: tradingAccount._id, mode },
        { $set: { lastActiveAt: new Date() } },
        { new: true }
      );
    }
    
    // Set all other modes to have old lastActiveAt
    await Account.updateMany(
      { tradingAccountId: tradingAccount._id, mode: { $ne: mode } },
      { $set: { lastActiveAt: new Date(0) } }
    );

    return NextResponse.json({
      message: `Switched to ${mode} mode`,
      mode: mode,
      balance: account?.balance ?? (mode === 'demo' ? 10000 : 0),
      equity: account?.equity ?? (mode === 'demo' ? 10000 : 0),
      tradingAccount: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
      },
    });
  } catch (error) {
    console.error('Switch account mode error:', error);
    return NextResponse.json(
      { error: 'Failed to switch account mode' },
      { status: 500 }
    );
  }
}
