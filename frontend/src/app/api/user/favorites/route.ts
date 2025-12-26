import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token.value, JWT_SECRET) as DecodedToken;
    await dbConnect();
    const user = await User.findById(decoded.userId);
    return user;
  } catch {
    return null;
  }
}

// GET /api/user/favorites - Get user's favorite symbols
export async function GET() {
  try {
    const user = await getUserFromToken();
    console.log('[API] GET /api/user/favorites - User:', user?._id);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log('[API] Returning favorites:', user.favoriteSymbols);
    return NextResponse.json({ favorites: user.favoriteSymbols || [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

// PUT /api/user/favorites - Update user's favorite symbols
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken();
    console.log('[API] PUT /api/user/favorites - User:', user?._id);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { favorites } = body;
    console.log('[API] Updating all favorites to:', favorites);

    if (!Array.isArray(favorites)) {
      return NextResponse.json({ error: "Favorites must be an array" }, { status: 400 });
    }

    // Update user's favorites
    user.favoriteSymbols = favorites;
    // Mark the array as modified so Mongoose knows to save it
    user.markModified('favoriteSymbols');
    await user.save();
    console.log('[API] Saved all favorites:', user.favoriteSymbols);

    return NextResponse.json({ favorites: user.favoriteSymbols }, { status: 200 });
  } catch (error) {
    console.error("Error updating favorites:", error);
    return NextResponse.json({ error: "Failed to update favorites" }, { status: 500 });
  }
}

// POST /api/user/favorites - Add a symbol to favorites
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken();
    console.log('[API] POST /api/user/favorites - User:', user?._id);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { symbol } = body;
    console.log('[API] Adding symbol:', symbol);
    console.log('[API] Current favorites:', user.favoriteSymbols);

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Add symbol if not already in favorites
    if (!user.favoriteSymbols) {
      user.favoriteSymbols = [];
    }

    if (!user.favoriteSymbols.includes(symbol)) {
      user.favoriteSymbols.push(symbol);
      // Mark the array as modified so Mongoose knows to save it
      user.markModified('favoriteSymbols');
      await user.save();
      console.log('[API] Saved favorites:', user.favoriteSymbols);
    } else {
      console.log('[API] Symbol already in favorites');
    }

    return NextResponse.json({ favorites: user.favoriteSymbols }, { status: 200 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

// DELETE /api/user/favorites - Remove a symbol from favorites
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromToken();
    console.log('[API] DELETE /api/user/favorites - User:', user?._id);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    console.log('[API] Removing symbol:', symbol);
    console.log('[API] Current favorites:', user.favoriteSymbols);

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Remove symbol from favorites
    if (user.favoriteSymbols) {
      user.favoriteSymbols = user.favoriteSymbols.filter((s: string) => s !== symbol);
      // Mark the array as modified so Mongoose knows to save it
      user.markModified('favoriteSymbols');
      await user.save();
      console.log('[API] Saved favorites after removal:', user.favoriteSymbols);
    }

    return NextResponse.json({ favorites: user.favoriteSymbols || [] }, { status: 200 });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}

