import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import TradingAccount from "@/models/TradingAccount"; // Import explicitly
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

interface TradingAccountData {
  _id: string;
  name: string;
  accountNumber: string;
  isActive: boolean;
  live?: AccountData;
  demo?: AccountData;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get all users
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // Get all trading accounts
    const tradingAccounts = await TradingAccount.find();

    // Get all balance accounts
    const accounts = await Account.find();
    
    // Group balance accounts by tradingAccountId
    const accountsByTradingId = new Map<string, { live?: AccountData; demo?: AccountData }>();
    
    // Also track legacy accounts by userId (fallback)
    const legacyAccountsByUserId = new Map<string, { live?: AccountData; demo?: AccountData }>();
    
    accounts.forEach((acc) => {
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

      if (acc.tradingAccountId) {
        const taId = acc.tradingAccountId.toString();
        if (!accountsByTradingId.has(taId)) {
          accountsByTradingId.set(taId, {});
        }
        const ta = accountsByTradingId.get(taId)!;
        if (acc.mode === 'demo') ta.demo = accountData;
        else ta.live = accountData;
      } else if (acc.userId) {
        // Legacy fallback
        const uId = acc.userId.toString();
        if (!legacyAccountsByUserId.has(uId)) {
          legacyAccountsByUserId.set(uId, {});
        }
        const ua = legacyAccountsByUserId.get(uId)!;
        if (acc.mode === 'demo') ua.demo = accountData;
        else ua.live = accountData;
      }
    });

    // Group trading accounts by userId
    const tradingAccountsByUserId = new Map<string, TradingAccountData[]>();
    
    tradingAccounts.forEach((ta) => {
        const userIdStr = ta.userId.toString();
        if (!tradingAccountsByUserId.has(userIdStr)) {
            tradingAccountsByUserId.set(userIdStr, []);
        }
        
        const balances = accountsByTradingId.get(ta._id.toString()) || {};
        
        tradingAccountsByUserId.get(userIdStr)!.push({
            _id: ta._id.toString(),
            name: ta.name,
            accountNumber: ta.accountNumber,
            isActive: ta.isActive,
            live: balances.live,
            demo: balances.demo
        });
    });

    // Combine user data with account data
    const usersWithAccounts = users.map((user) => {
      const userId = user._id.toString();
      let userTradingAccounts = tradingAccountsByUserId.get(userId) || [];
      
      // If no trading accounts but has legacy accounts, create a virtual one? 
      // Or just map legacy accounts to the legacy "accounts" field.
      const legacyAccounts = legacyAccountsByUserId.get(userId);
      
      // Find active account or default to first for the legacy "accounts" field
      const activeAccount = userTradingAccounts.find(ta => ta.isActive) || userTradingAccounts[0];
      
      const legacyLive = activeAccount?.live || legacyAccounts?.live || null;
      const legacyDemo = activeAccount?.demo || legacyAccounts?.demo || null;

      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Legacy structure for backward compatibility
        accounts: {
          live: legacyLive,
          demo: legacyDemo,
        },
        // New structure
        tradingAccounts: userTradingAccounts
      };
    });

    return NextResponse.json({ users: usersWithAccounts }, { status: 200 });
  } catch (error) {
    console.error("Error in admin users API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
