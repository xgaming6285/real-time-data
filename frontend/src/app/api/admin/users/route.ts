import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import { verifyAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get all users with their accounts
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // Get all accounts
    const accounts = await Account.find();
    console.log('[Admin API] All accounts in DB:', accounts.map(acc => ({ 
      _id: acc._id, 
      userId: acc.userId, 
      userIdType: typeof acc.userId,
      leverage: acc.leverage,
      isAutoLeverage: acc.isAutoLeverage 
    })));
    const accountMap = new Map(
      accounts.map((acc) => [acc.userId.toString(), acc])
    );

    // Combine user data with account data
    const usersWithAccounts = users.map((user) => {
      const account = accountMap.get(user._id.toString());
      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        account: account
          ? {
              balance: account.balance,
              equity: account.equity,
              leverage: account.leverage,
              isAutoLeverage: account.isAutoLeverage ?? false,
              currency: account.currency,
            }
          : null,
      };
    });

    return NextResponse.json({ users: usersWithAccounts }, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
