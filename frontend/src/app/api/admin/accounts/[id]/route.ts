import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Account from "@/models/Account";
import { verifyAdmin } from "@/lib/adminAuth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { balance, leverage } = body;

    await dbConnect();

    const account = await Account.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (balance !== undefined) {
      account.balance = balance;
      account.equity = balance; // Reset equity to balance on manual update
    }

    if (leverage !== undefined) {
      account.leverage = leverage;
    }

    await account.save();

    return NextResponse.json(
      { 
        message: "Account updated successfully",
        account: {
            _id: account._id,
            balance: account.balance,
            equity: account.equity,
            leverage: account.leverage,
            isAutoLeverage: account.isAutoLeverage,
            currency: account.currency,
            margin: account.margin,
            freeMargin: account.freeMargin
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

