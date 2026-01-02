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

// POST - Switch to a different trading account
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
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Verify the account belongs to this user
    const tradingAccount = await TradingAccount.findOne({
      _id: accountId,
      userId,
    });
    
    if (!tradingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Deactivate all other accounts for this user
    await TradingAccount.updateMany(
      { userId, _id: { $ne: tradingAccount._id } },
      { $set: { isActive: false } }
    );
    
    // Activate the selected account
    tradingAccount.isActive = true;
    await tradingAccount.save();
    
    // Get the balances for this trading account
    const liveBalance = await Account.findOne({ tradingAccountId: tradingAccount._id, mode: 'live' });
    const demoBalance = await Account.findOne({ tradingAccountId: tradingAccount._id, mode: 'demo' });
    
    // Determine which mode was last active
    const liveLast = liveBalance?.lastActiveAt || new Date(0);
    const demoLast = demoBalance?.lastActiveAt || new Date(0);
    const activeMode = liveLast > demoLast ? 'live' : 'demo';
    const activeBalance = activeMode === 'live' ? liveBalance : demoBalance;

    return NextResponse.json({
      message: `Switched to ${tradingAccount.name}`,
      account: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
        color: tradingAccount.color,
        isActive: true,
        mode: activeMode,
        balances: {
          live: liveBalance ? {
            balance: liveBalance.balance,
            equity: liveBalance.equity,
            leverage: liveBalance.leverage,
          } : { balance: 0, equity: 0, leverage: 30 },
          demo: demoBalance ? {
            balance: demoBalance.balance,
            equity: demoBalance.equity,
            leverage: demoBalance.leverage,
          } : { balance: 10000, equity: 10000, leverage: 30 },
        },
      },
      currentBalance: activeBalance ? {
        balance: activeBalance.balance,
        equity: activeBalance.equity,
        margin: activeBalance.margin,
        freeMargin: activeBalance.freeMargin,
        marginLevel: activeBalance.marginLevel,
        currency: activeBalance.currency,
        leverage: activeBalance.leverage,
        isAutoLeverage: activeBalance.isAutoLeverage ?? false,
        mode: activeMode,
      } : null,
    });
  } catch (error) {
    console.error('Switch account error:', error);
    return NextResponse.json(
      { error: 'Failed to switch account' },
      { status: 500 }
    );
  }
}

