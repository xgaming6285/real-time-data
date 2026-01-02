import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import TradingAccount from '@/models/TradingAccount';
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
    return new mongoose.Types.ObjectId(decoded.userId);
  } catch {
    return null;
  }
}

// GET - Get a single trading account details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const tradingAccount = await TradingAccount.findOne({ _id: id, userId });
    
    if (!tradingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Get balances for this trading account
    const liveBalance = await Account.findOne({ tradingAccountId: tradingAccount._id, mode: 'live' });
    const demoBalance = await Account.findOne({ tradingAccountId: tradingAccount._id, mode: 'demo' });

    return NextResponse.json({
      account: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
        isActive: tradingAccount.isActive,
        color: tradingAccount.color,
        createdAt: tradingAccount.createdAt,
        balances: {
          live: liveBalance ? {
            balance: liveBalance.balance,
            equity: liveBalance.equity,
            margin: liveBalance.margin,
            freeMargin: liveBalance.freeMargin,
            leverage: liveBalance.leverage,
          } : { balance: 0, equity: 0, margin: 0, freeMargin: 0, leverage: 30 },
          demo: demoBalance ? {
            balance: demoBalance.balance,
            equity: demoBalance.equity,
            margin: demoBalance.margin,
            freeMargin: demoBalance.freeMargin,
            leverage: demoBalance.leverage,
          } : { balance: 10000, equity: 10000, margin: 0, freeMargin: 10000, leverage: 30 },
        },
      },
    });
  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json(
      { error: 'Failed to get account' },
      { status: 500 }
    );
  }
}

// PATCH - Update a trading account (name, color)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    await dbConnect();
    
    const tradingAccount = await TradingAccount.findOne({ _id: id, userId });
    
    if (!tradingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Check for duplicate name if name is being updated
    if (name && name.trim() !== tradingAccount.name) {
      const existingName = await TradingAccount.findOne({ 
        userId, 
        name: name.trim(),
        _id: { $ne: id }
      });
      
      if (existingName) {
        return NextResponse.json(
          { error: 'An account with this name already exists' },
          { status: 400 }
        );
      }
      
      tradingAccount.name = name.trim();
    }
    
    if (color) {
      tradingAccount.color = color;
    }
    
    await tradingAccount.save();

    return NextResponse.json({
      message: 'Account updated',
      account: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
        color: tradingAccount.color,
        isActive: tradingAccount.isActive,
      },
    });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a trading account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const tradingAccount = await TradingAccount.findOne({ _id: id, userId });
    
    if (!tradingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Check if this is the only account - don't allow deletion
    const accountCount = await TradingAccount.countDocuments({ userId });
    if (accountCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only account. Create another account first.' },
        { status: 400 }
      );
    }
    
    // Check if this account is active
    if (tradingAccount.isActive) {
      // Switch to another account before deleting
      const otherAccount = await TradingAccount.findOne({ userId, _id: { $ne: id } });
      if (otherAccount) {
        otherAccount.isActive = true;
        await otherAccount.save();
      }
    }
    
    // Get balance records for this trading account
    const balances = await Account.find({ tradingAccountId: id });
    
    // Check for open orders on any balance
    for (const balance of balances) {
      const openOrders = await Order.countDocuments({ accountId: balance._id, status: 'open' });
      if (openOrders > 0) {
        return NextResponse.json(
          { error: 'Cannot delete account with open orders. Close all positions first.' },
          { status: 400 }
        );
      }
    }
    
    // Delete all balance records for this trading account
    await Account.deleteMany({ tradingAccountId: id });
    
    // Delete the trading account
    await TradingAccount.deleteOne({ _id: id });

    return NextResponse.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

