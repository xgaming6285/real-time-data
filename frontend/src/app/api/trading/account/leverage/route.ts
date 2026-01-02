import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import TradingAccount from '@/models/TradingAccount';

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

// PATCH - Update account leverage
export async function PATCH(request: Request) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { leverage, isAutoLeverage } = body;

    console.log('[Leverage API] userId:', userId, 'leverage:', leverage, 'isAutoLeverage:', isAutoLeverage);

    if (!leverage || leverage < 1 || leverage > 1000) {
      return NextResponse.json(
        { error: 'Invalid leverage value (must be between 1 and 1000)' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Find the active trading account first
    let tradingAccount = await TradingAccount.findOne({ userId, isActive: true });
    
    // Fallback: if no active account, find any account
    if (!tradingAccount) {
      tradingAccount = await TradingAccount.findOne({ userId }).sort({ createdAt: -1 });
    }
    
    if (!tradingAccount) {
      return NextResponse.json(
        { error: 'No trading account found' },
        { status: 404 }
      );
    }

    // Find the active balance for this trading account
    const accounts = await Account.find({ tradingAccountId: tradingAccount._id }).sort({ lastActiveAt: -1 });
    const activeMode: 'live' | 'demo' = accounts.length > 0 ? accounts[0].mode : 'live';
    
    console.log('[Leverage API] Active mode:', activeMode, 'Trading Account:', tradingAccount._id);
    
    let account = await Account.findOne({ tradingAccountId: tradingAccount._id, mode: activeMode });
    
    if (!account) {
      // Create new account with proper defaults for the mode if it doesn't exist
      const defaultBalance = activeMode === 'demo' ? 10000 : 0;
      account = await Account.create({
        userId,
        tradingAccountId: tradingAccount._id,
        mode: activeMode,
        balance: defaultBalance,
        equity: defaultBalance,
        margin: 0,
        freeMargin: defaultBalance,
        leverage,
        isAutoLeverage: isAutoLeverage ?? false,
        lastActiveAt: new Date(),
      });
    } else {
      // Update existing account
      account.leverage = leverage;
      if (typeof isAutoLeverage === 'boolean') {
        account.isAutoLeverage = isAutoLeverage;
      }
      account.lastActiveAt = new Date(); // Update activity timestamp
      await account.save();
    }

    console.log('[Leverage API] Updated account:', { _id: account._id, leverage: account.leverage, isAutoLeverage: account.isAutoLeverage });

    return NextResponse.json({
      message: 'Leverage updated successfully',
      leverage: account.leverage,
      isAutoLeverage: account.isAutoLeverage ?? false,
    });
  } catch (error) {
    console.error('Leverage update error:', error);
    return NextResponse.json(
      { error: 'Failed to update leverage' },
      { status: 500 }
    );
  }
}

