import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Account from "@/models/Account";
import bcrypt from "bcryptjs";
import { verifyAdmin } from "@/lib/adminAuth";

// GET single user
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const user = await User.findById(id).select("-password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const account = await Account.findOne({ userId: id });

    return NextResponse.json(
      {
        user: {
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
                currency: account.currency,
                margin: account.margin,
                freeMargin: account.freeMargin,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// UPDATE user
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
    const { name, email, password, role, balance } = body;

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
      user.email = email;
    }
    if (password !== undefined && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    if (role !== undefined && ["user", "admin"].includes(role)) {
      user.role = role;
    }

    await user.save();

    // Update account balance if provided
    if (balance !== undefined) {
      let account = await Account.findOne({ userId: id });
      if (account) {
        account.balance = balance;
        account.equity = balance; // Reset equity to balance
        await account.save();
      } else {
        // Create account if it doesn't exist
        account = await Account.create({
          userId: id,
          balance: balance,
          equity: balance,
        });
      }
    }

    // Fetch updated data
    const updatedUser = await User.findById(id).select("-password");
    const account = await Account.findOne({ userId: id });

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: {
          _id: updatedUser._id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role || "user",
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          account: account
            ? {
                balance: account.balance,
                equity: account.equity,
                leverage: account.leverage,
                currency: account.currency,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    // Prevent deleting yourself
    if (admin._id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete associated account
    await Account.deleteOne({ userId: id });

    // Delete user
    await User.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
