import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
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
    
    // Check if user has any accounts - if not, they're in default "live" mode
    const accounts = await Account.find({ userId }).sort({ lastActiveAt: -1 });
    
    // Find active account (the one that was most recently active)
    let activeMode: 'live' | 'demo' = 'live';
    
    if (accounts.length > 0) {
      activeMode = accounts[0].mode;
    }

    return NextResponse.json({
      mode: activeMode,
      availableModes: ['live', 'demo'],
    });
  } catch (error) {
    console.error('Get account mode error:', error);
    return NextResponse.json(
      { error: 'Failed to get account mode' },
      { status: 500 }
    );
  }
}

// POST - Switch account mode
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
    
    // First, migrate any legacy accounts (without mode field) to 'live' mode
    const legacyAccounts = await Account.find({ userId, mode: { $exists: false } });
    for (const legacyAcc of legacyAccounts) {
      console.log('[Mode Switch] Found legacy account without mode, migrating to live:', legacyAcc._id);
      legacyAcc.mode = 'live';
      legacyAcc.lastActiveAt = new Date(0); // Set to epoch
      await legacyAcc.save();
    }
    
    // Also migrate accounts where mode is null or undefined
    await Account.updateMany(
      { userId, $or: [{ mode: null }, { mode: { $exists: false } }] },
      { $set: { mode: 'live', lastActiveAt: new Date(0) } }
    );
    
    // Find or create account for the selected mode
    let account = await Account.findOne({ userId, mode });
    
    console.log('[Mode Switch] Switching to mode:', mode, 'Found existing account:', !!account);
    
    if (!account) {
      // Create new account for this mode
      const defaultBalance = mode === 'demo' ? 10000 : 0;
      account = await Account.create({
        userId,
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
      console.log('[Mode Switch] Created new account:', account._id, 'mode:', account.mode);
    } else {
      // Use findOneAndUpdate to ensure lastActiveAt is properly set
      account = await Account.findOneAndUpdate(
        { userId, mode },
        { $set: { lastActiveAt: new Date() } },
        { new: true }
      );
      console.log('[Mode Switch] Updated existing account:', account._id, 'lastActiveAt:', account.lastActiveAt);
    }
    
    // Set all other accounts to have old lastActiveAt
    // Use $and to ensure we only update accounts that have a different mode
    await Account.updateMany(
      { userId, mode: { $ne: mode, $exists: true } },
      { $set: { lastActiveAt: new Date(0) } }
    );
    
    // Re-fetch the account to ensure we have the latest data
    const finalAccount = await Account.findOne({ userId, mode });
    console.log('[Mode Switch] Final account:', { 
      id: finalAccount?._id, 
      mode: finalAccount?.mode, 
      balance: finalAccount?.balance,
      lastActiveAt: finalAccount?.lastActiveAt 
    });
    
    // List all accounts to debug
    const allAccounts = await Account.find({ userId });
    console.log('[Mode Switch] All accounts after switch:', allAccounts.map(a => ({
      id: a._id,
      mode: a.mode,
      balance: a.balance,
      lastActiveAt: a.lastActiveAt
    })));

    return NextResponse.json({
      message: `Switched to ${mode} mode`,
      mode: mode, // Use the requested mode directly
      balance: finalAccount?.balance ?? (mode === 'demo' ? 10000 : 0),
      equity: finalAccount?.equity ?? (mode === 'demo' ? 10000 : 0),
    });
  } catch (error) {
    console.error('Switch account mode error:', error);
    return NextResponse.json(
      { error: 'Failed to switch account mode' },
      { status: 500 }
    );
  }
}

