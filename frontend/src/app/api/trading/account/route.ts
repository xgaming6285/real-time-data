import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import TradingAccount from "@/models/TradingAccount";
import Account from "@/models/Account";
import Order from "@/models/Order";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper to get user ID from token as ObjectId
async function getUserId(): Promise<mongoose.Types.ObjectId | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

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
    return existingTradingAccounts[0]; // Return existing
  }

  // Check for legacy accounts (accounts with userId but no tradingAccountId)
  const legacyAccounts = await Account.find({
    userId,
    $or: [{ tradingAccountId: { $exists: false } }, { tradingAccountId: null }],
  });

  // Create a default trading account for the user
  const tradingAccount = await TradingAccount.create({
    userId,
    name: "Main Account",
    isActive: true,
  });

  if (legacyAccounts.length > 0) {
    console.log(
      "[Migration] Migrating",
      legacyAccounts.length,
      "legacy accounts for user",
      userId
    );

    // Update all legacy accounts to reference the new trading account
    await Account.updateMany(
      {
        userId,
        $or: [
          { tradingAccountId: { $exists: false } },
          { tradingAccountId: null },
        ],
      },
      { $set: { tradingAccountId: tradingAccount._id } }
    );

    console.log(
      "[Migration] Created trading account",
      tradingAccount.accountNumber,
      "and migrated legacy accounts"
    );
  }

  return tradingAccount;
}

// GET - Fetch account balance and info
export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    // Migrate legacy accounts and get/create active trading account
    const activeTradingAccount = await migrateUserAccounts(userId);

    // Ensure we have the active trading account
    let tradingAccount = await TradingAccount.findOne({
      userId,
      isActive: true,
    });
    if (!tradingAccount) {
      tradingAccount = activeTradingAccount;
      tradingAccount.isActive = true;
      await tradingAccount.save();
    }

    // Get all balance records for this trading account
    const balances = await Account.find({
      tradingAccountId: tradingAccount._id,
    });

    // Determine which mode is currently active based on lastActiveAt
    let activeMode: "live" | "demo" = "live";
    let account = balances.find((b) => b.mode === "live");

    if (balances.length > 0) {
      const sortedBalances = [...balances].sort((a, b) => {
        const dateA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const dateB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return dateB - dateA;
      });

      account = sortedBalances[0];
      activeMode = account?.mode || "live";
    }

    // Create balance records if they don't exist
    if (!account || balances.length === 0) {
      account = await Account.create({
        tradingAccountId: tradingAccount._id,
        mode: "live",
        balance: 0,
        equity: 0,
        margin: 0,
        freeMargin: 0,
        leverage: 30,
        lastActiveAt: new Date(),
      });

      // Also create demo balance
      await Account.create({
        tradingAccountId: tradingAccount._id,
        mode: "demo",
        balance: 10000,
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
        leverage: 30,
        lastActiveAt: new Date(0),
      });
    }

    // Calculate current equity based on open positions for this account
    const openOrders = await Order.find({
      $or: [
        { accountId: account._id },
        { userId, accountId: { $exists: false } }, // Legacy orders
      ],
      status: "open",
    });

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
    account.marginLevel =
      totalMargin > 0 ? (account.equity / totalMargin) * 100 : 0;

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
      // Include trading account info
      tradingAccount: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
        color: tradingAccount.color,
      },
    });
  } catch (error) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// POST - Initialize or reset account
export async function POST(request: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      initialBalance = 10000,
      leverage = 30,
      isAutoLeverage = false,
      mode,
    } = body;

    await dbConnect();

    // Get active trading account
    let tradingAccount = await TradingAccount.findOne({
      userId,
      isActive: true,
    });
    if (!tradingAccount) {
      tradingAccount = await migrateUserAccounts(userId);
    }

    // Get the current active mode if not specified
    let targetMode: "live" | "demo" = mode;
    if (!targetMode) {
      const balances = await Account.find({
        tradingAccountId: tradingAccount._id,
      }).sort({ lastActiveAt: -1 });
      targetMode = balances.length > 0 ? balances[0].mode : "live";
    }

    // Get the account balance record for this mode
    let account = await Account.findOne({
      tradingAccountId: tradingAccount._id,
      mode: targetMode,
    });

    // Close all open orders for this account
    if (account) {
      await Order.updateMany(
        { accountId: account._id, status: "open" },
        { status: "cancelled", closedAt: new Date() }
      );
    }

    // Reset or create account for the specified mode
    account = await Account.findOneAndUpdate(
      { tradingAccountId: tradingAccount._id, mode: targetMode },
      {
        balance: initialBalance,
        equity: initialBalance,
        margin: 0,
        freeMargin: initialBalance,
        marginLevel: 0,
        leverage,
        isAutoLeverage,
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );

    if (!account) {
      throw new Error("Failed to create or update account");
    }

    return NextResponse.json({
      message: "Account initialized",
      balance: account.balance,
      equity: account.equity,
      leverage: account.leverage,
      isAutoLeverage: account.isAutoLeverage ?? false,
      mode: account.mode,
      tradingAccount: {
        _id: tradingAccount._id,
        name: tradingAccount.name,
        accountNumber: tradingAccount.accountNumber,
      },
    });
  } catch (error) {
    console.error("Account init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize account" },
      { status: 500 }
    );
  }
}
