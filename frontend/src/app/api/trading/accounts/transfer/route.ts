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

// POST - Transfer funds between accounts
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
    const { fromAccountId, toAccountId, amount, mode } = body;

    // Validate inputs
    if (!fromAccountId || !toAccountId) {
      return NextResponse.json(
        { error: 'Both source and destination account IDs are required' },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: 'Cannot transfer to the same account' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Transfer amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!mode || !['live', 'demo'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode must be "live" or "demo"' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Verify both accounts belong to this user
    const [fromTradingAccount, toTradingAccount] = await Promise.all([
      TradingAccount.findOne({ _id: fromAccountId, userId }),
      TradingAccount.findOne({ _id: toAccountId, userId }),
    ]);
    
    if (!fromTradingAccount) {
      return NextResponse.json(
        { error: 'Source account not found' },
        { status: 404 }
      );
    }
    
    if (!toTradingAccount) {
      return NextResponse.json(
        { error: 'Destination account not found' },
        { status: 404 }
      );
    }
    
    // Get the balance records for the specified mode
    const [fromBalance, toBalance] = await Promise.all([
      Account.findOne({ tradingAccountId: fromAccountId, mode }),
      Account.findOne({ tradingAccountId: toAccountId, mode }),
    ]);
    
    if (!fromBalance) {
      return NextResponse.json(
        { error: `Source account has no ${mode} balance` },
        { status: 400 }
      );
    }
    
    // Check if source has sufficient balance
    // For transfers, we use free margin (balance - used margin) to avoid affecting open positions
    if (fromBalance.freeMargin < amount) {
      return NextResponse.json(
        { error: `Insufficient free margin. Available: $${fromBalance.freeMargin.toFixed(2)}` },
        { status: 400 }
      );
    }
    
    // Create destination balance if it doesn't exist
    let targetBalance = toBalance;
    if (!targetBalance) {
      const defaultBalance = mode === 'demo' ? 10000 : 0;
      targetBalance = await Account.create({
        tradingAccountId: toAccountId,
        mode,
        balance: defaultBalance,
        equity: defaultBalance,
        margin: 0,
        freeMargin: defaultBalance,
        leverage: 30,
        lastActiveAt: new Date(0),
      });
    }
    
    // Perform the transfer using a transaction for data consistency
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Deduct from source
        fromBalance.balance -= amount;
        fromBalance.equity -= amount;
        fromBalance.freeMargin -= amount;
        await fromBalance.save({ session });
        
        // Add to destination
        targetBalance.balance += amount;
        targetBalance.equity += amount;
        targetBalance.freeMargin += amount;
        await targetBalance.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      message: `Successfully transferred $${amount.toFixed(2)} from ${fromTradingAccount.name} to ${toTradingAccount.name}`,
      transfer: {
        from: {
          accountId: fromAccountId,
          name: fromTradingAccount.name,
          newBalance: fromBalance.balance,
        },
        to: {
          accountId: toAccountId,
          name: toTradingAccount.name,
          newBalance: targetBalance.balance,
        },
        amount,
        mode,
      },
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { error: 'Failed to complete transfer' },
      { status: 500 }
    );
  }
}

