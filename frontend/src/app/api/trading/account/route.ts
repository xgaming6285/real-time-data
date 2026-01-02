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
    
    // First, clean up legacy accounts using updateMany (more reliable than individual saves)
    // Set mode='live' and lastActiveAt=epoch for any accounts without a mode
    const migrationResult = await Account.updateMany(
      { userId, $or: [{ mode: { $exists: false } }, { mode: null }] },
      { $set: { mode: 'live', lastActiveAt: new Date(0) } }
    );
    
    if (migrationResult.modifiedCount > 0) {
      console.log('[Account GET] Migrated', migrationResult.modifiedCount, 'legacy accounts to live mode');
    }
    
    // Deduplicate accounts - keep only one per mode (the one with highest balance)
    const allAccounts = await Account.find({ userId });
    
    // Group by mode
    const liveAccounts = allAccounts.filter(a => a.mode === 'live');
    const demoAccounts = allAccounts.filter(a => a.mode === 'demo');
    
    // Keep the best account for each mode, delete duplicates
    const accountsToDelete: string[] = [];
    
    if (liveAccounts.length > 1) {
      // Sort by balance descending, keep the first one
      liveAccounts.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      const keepLive = liveAccounts[0];
      for (let i = 1; i < liveAccounts.length; i++) {
        accountsToDelete.push(liveAccounts[i]._id.toString());
      }
      console.log('[Account GET] Keeping live account:', keepLive._id, 'balance:', keepLive.balance);
    }
    
    if (demoAccounts.length > 1) {
      // Sort by balance descending, keep the first one
      demoAccounts.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      const keepDemo = demoAccounts[0];
      for (let i = 1; i < demoAccounts.length; i++) {
        accountsToDelete.push(demoAccounts[i]._id.toString());
      }
      console.log('[Account GET] Keeping demo account:', keepDemo._id, 'balance:', keepDemo.balance);
    }
    
    if (accountsToDelete.length > 0) {
      console.log('[Account GET] Deleting', accountsToDelete.length, 'duplicate accounts');
      await Account.deleteMany({ _id: { $in: accountsToDelete } });
    }
    
    // Now find all accounts for this user (after cleanup)
    const accounts = await Account.find({ userId });
    
    console.log('[Account GET] Final accounts:', accounts.map(a => ({ 
      id: a._id, 
      mode: a.mode, 
      lastActiveAt: a.lastActiveAt,
      balance: a.balance 
    })));
    
    let account;
    let activeMode: 'live' | 'demo' = 'live';
    
    if (accounts.length === 0) {
      // Create new live account with default balance ($0)
      account = await Account.create({
        userId,
        mode: 'live',
        balance: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        lastActiveAt: new Date(),
      });
      console.log('[Account GET] Created new live account');
    } else {
      // Find the account with the most recent lastActiveAt
      // Handle cases where lastActiveAt might be undefined
      console.log('[Account GET] Sorting accounts by lastActiveAt:');
      accounts.forEach(a => {
        console.log('  -', a.mode, 'lastActiveAt:', a.lastActiveAt, 'timestamp:', a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0);
      });
      
      const sortedAccounts = [...accounts].sort((a, b) => {
        const dateA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const dateB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return dateB - dateA; // Descending (newest first)
      });
      
      console.log('[Account GET] After sorting:');
      sortedAccounts.forEach(a => {
        console.log('  -', a.mode, 'lastActiveAt:', a.lastActiveAt);
      });
      
      account = sortedAccounts[0];
      activeMode = account.mode || 'live';
      console.log('[Account GET] Selected account:', account._id, 'mode:', activeMode, 'balance:', account.balance);
    }

    // Calculate current equity based on open positions for this mode
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
      mode: activeMode,
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
    const { initialBalance = 10000, leverage = 30, isAutoLeverage = false, mode } = body;

    await dbConnect();
    
    // Get the current active mode if not specified
    let targetMode: 'live' | 'demo' = mode;
    if (!targetMode) {
      const accounts = await Account.find({ userId }).sort({ lastActiveAt: -1 });
      targetMode = accounts.length > 0 ? accounts[0].mode : 'live';
    }
    
    // Close all open orders first for this mode
    await Order.updateMany(
      { userId, status: 'open' },
      { status: 'cancelled', closedAt: new Date() }
    );
    
    // Reset or create account for the specified mode
    const account = await Account.findOneAndUpdate(
      { userId, mode: targetMode },
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
      mode: account.mode,
    });
  } catch (error) {
    console.error('Account init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize account' },
      { status: 500 }
    );
  }
}

