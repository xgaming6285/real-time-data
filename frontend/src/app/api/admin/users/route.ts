import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import { verifyAdmin } from "@/lib/adminAuth";

interface AccountData {
  _id: string;
  balance: number;
  equity: number;
  leverage: number;
  isAutoLeverage: boolean;
  currency: string;
  margin: number;
  freeMargin: number;
}

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
    
    // Group accounts by userId and mode
    const accountsByUser = new Map<string, { live?: AccountData; demo?: AccountData }>();
    
    accounts.forEach((acc) => {
      const userIdStr = acc.userId.toString();
      if (!accountsByUser.has(userIdStr)) {
        accountsByUser.set(userIdStr, {});
      }
      const userAccounts = accountsByUser.get(userIdStr)!;
      const accountData: AccountData = {
        _id: acc._id.toString(),
        balance: acc.balance,
        equity: acc.equity,
        leverage: acc.leverage,
        isAutoLeverage: acc.isAutoLeverage ?? false,
        currency: acc.currency,
        margin: acc.margin,
        freeMargin: acc.freeMargin,
      };
      
      if (acc.mode === 'demo') {
        userAccounts.demo = accountData;
      } else {
        userAccounts.live = accountData;
      }
    });

    // Combine user data with account data
    const usersWithAccounts = users.map((user) => {
      const userAccounts = accountsByUser.get(user._id.toString()) || {};
      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        accounts: {
          live: userAccounts.live || null,
          demo: userAccounts.demo || null,
        },
      };
    });

    return NextResponse.json({ users: usersWithAccounts }, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
