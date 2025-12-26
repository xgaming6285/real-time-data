import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get user ID from token
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as { userId: string };
    return decoded.userId;
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
    const { leverage } = body;

    if (!leverage || leverage < 1 || leverage > 500) {
      return NextResponse.json(
        { error: 'Invalid leverage value (must be between 1 and 500)' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    const account = await Account.findOneAndUpdate(
      { userId },
      { leverage },
      { new: true, upsert: true }
    );

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Leverage updated successfully',
      leverage: account.leverage,
    });
  } catch (error) {
    console.error('Leverage update error:', error);
    return NextResponse.json(
      { error: 'Failed to update leverage' },
      { status: 500 }
    );
  }
}

