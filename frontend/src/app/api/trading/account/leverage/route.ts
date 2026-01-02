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
    
    // Build update object - always update leverage, optionally update isAutoLeverage
    const updateData: { leverage: number; isAutoLeverage?: boolean } = { leverage };
    if (typeof isAutoLeverage === 'boolean') {
      updateData.isAutoLeverage = isAutoLeverage;
    }
    
    // Find existing account first to debug
    const existingAccount = await Account.findOne({ userId });
    console.log('[Leverage API] Existing account:', existingAccount ? { _id: existingAccount._id, leverage: existingAccount.leverage, userId: existingAccount.userId } : 'NOT FOUND');
    
    const account = await Account.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    console.log('[Leverage API] Updated account:', { _id: account._id, leverage: account.leverage, isAutoLeverage: account.isAutoLeverage });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

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

