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

// GET /api/user/indicators - Get user's indicator preferences
export async function GET() {
  try {
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(
      {
        favoriteIndicators: user.favoriteIndicators || [],
        activeIndicators: user.chartConfig?.activeIndicators || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching indicators:", error);
    return NextResponse.json(
      { error: "Failed to fetch indicators" },
      { status: 500 }
    );
  }
}

// PUT /api/user/indicators - Update user's indicator preferences
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    console.log("[API] PUT /api/user/indicators received:", JSON.stringify(body));

    const { favoriteIndicators, activeIndicators } = body;

    if (favoriteIndicators !== undefined) {
      if (!Array.isArray(favoriteIndicators)) {
        return NextResponse.json(
          { error: "favoriteIndicators must be an array" },
          { status: 400 }
        );
      }
      user.favoriteIndicators = favoriteIndicators;
      user.markModified("favoriteIndicators");
    }

    if (activeIndicators !== undefined) {
      if (!Array.isArray(activeIndicators)) {
        return NextResponse.json(
          { error: "activeIndicators must be an array" },
          { status: 400 }
        );
      }
      
      // Create a clean object for chartConfig to ensure Mongoose handles it correctly
      // We use JSON parse/stringify to break any Mongoose proxy references and ensure a plain object
      const currentConfig = user.chartConfig 
        ? JSON.parse(JSON.stringify(user.chartConfig)) 
        : { activeIndicators: [] };
      
      currentConfig.activeIndicators = activeIndicators;
      
      // Re-assign the complete object
      user.chartConfig = currentConfig;
      
      // Essential for Mixed types: tell Mongoose this path changed
      user.markModified("chartConfig");
    }

    await user.save();
    console.log("[API] Updated user indicators.");

    return NextResponse.json(
      {
        favoriteIndicators: user.favoriteIndicators,
        activeIndicators: user.chartConfig?.activeIndicators || [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating indicators:", error);
    if (error.name === 'ValidationError') {
         console.error("Validation Error Details:", JSON.stringify(error.errors, null, 2));
    }
    return NextResponse.json(
      { error: "Failed to update indicators", details: error.message },
      { status: 500 }
    );
  }
}

