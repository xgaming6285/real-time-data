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

// Helper to migrate legacy accounts to new trading account structure
async function migrateUserAccounts(userId: mongoose.Types.ObjectId) {
  // Check if user has any trading accounts
  const existingTradingAccounts = await TradingAccount.find({ userId });
  
  if (existingTradingAccounts.length > 0) {
    return; // Already migrated
  }
  
  // Check for legacy accounts (accounts with userId but no tradingAccountId)
  const legacyAccounts = await Account.find({ 
    userId, 
    tradingAccountId: { $exists: false } 
  });
  
  if (legacyAccounts.length === 0) {
    return; // No legacy accounts to migrate
  }
  
  console.log('[Migration] Migrating', legacyAccounts.length, 'legacy accounts for user', userId);
  
  // Create a default trading account for the user
  const tradingAccount = await TradingAccount.create({
    userId,
    name: 'Main Account',
    isActive: true,
  });
  
  // Update all legacy accounts to reference the new trading account
  await Account.updateMany(
    { userId, tradingAccountId: { $exists: false } },
    { $set: { tradingAccountId: tradingAccount._id } }
  );
  
  console.log('[Migration] Created trading account', tradingAccount.accountNumber, 'and migrated legacy accounts');
}

// GET - List all trading accounts for the user
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
    
    // Migrate legacy accounts if needed
    await migrateUserAccounts(userId);
    
    // Get all trading accounts for this user
    const tradingAccounts = await TradingAccount.find({ userId })
      .sort({ createdAt: 1 });
    
    // If no trading accounts exist, create a default one
    if (tradingAccounts.length === 0) {
      const defaultAccount = await TradingAccount.create({
        userId,
        name: 'Main Account',
        isActive: true,
      });
      
      // Create live and demo balances for the default account
      await Account.create({
        tradingAccountId: defaultAccount._id,
        mode: 'live',
        balance: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        leverage: 30,
        lastActiveAt: new Date(),
      });
      
      await Account.create({
        tradingAccountId: defaultAccount._id,
        mode: 'demo',
        balance: 10000,
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
        leverage: 30,
        lastActiveAt: new Date(0),
      });
      
      tradingAccounts.push(defaultAccount);
    }
    
    // Get balances for all trading accounts
    const accountsWithBalances = await Promise.all(
      tradingAccounts.map(async (ta) => {
        const liveBalance = await Account.findOne({ tradingAccountId: ta._id, mode: 'live' });
        const demoBalance = await Account.findOne({ tradingAccountId: ta._id, mode: 'demo' });
        
        return {
          _id: ta._id,
          name: ta.name,
          accountNumber: ta.accountNumber,
          isActive: ta.isActive,
          color: ta.color,
          createdAt: ta.createdAt,
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
        };
      })
    );

    return NextResponse.json({
      accounts: accountsWithBalances,
      activeAccountId: tradingAccounts.find(a => a.isActive)?._id || tradingAccounts[0]?._id,
    });
  } catch (error) {
    console.error('List accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to list accounts' },
      { status: 500 }
    );
  }
}

// POST - Create a new trading account
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
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Migrate legacy accounts first
    await migrateUserAccounts(userId);
    
    // Check if user already has max accounts (limit to 10 for now)
    const existingCount = await TradingAccount.countDocuments({ userId });
    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum number of accounts reached (10)' },
        { status: 400 }
      );
    }
    
    // Check for duplicate name
    const existingName = await TradingAccount.findOne({ userId, name: name.trim() });
    if (existingName) {
      return NextResponse.json(
        { error: 'An account with this name already exists' },
        { status: 400 }
      );
    }
    
    // Create the new trading account
    const tradingAccount = await TradingAccount.create({
      userId,
      name: name.trim(),
      color: color || '#3b82f6',
      isActive: false, // Don't auto-switch to new account
    });
    
    // Create live and demo balances for the new account
    await Account.create({
      tradingAccountId: tradingAccount._id,
      mode: 'live',
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      leverage: 30,
      lastActiveAt: new Date(0),
    });
    
    await Account.create({
      tradingAccountId: tradingAccount._id,
      mode: 'demo',
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      leverage: 30,
      lastActiveAt: new Date(0),
    });

    return NextResponse.json({
      message: 'Account created successfully',
      account: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
        color: tradingAccount.color,
        isActive: tradingAccount.isActive,
        balances: {
          live: { balance: 0, equity: 0, leverage: 30 },
          demo: { balance: 10000, equity: 10000, leverage: 30 },
        },
      },
    });
  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

