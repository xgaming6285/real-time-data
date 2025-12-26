import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export async function verifyAdmin(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token");

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token.value, JWT_SECRET) as {
      userId: string;
      email: string;
      isAdmin: boolean;
    };

    await dbConnect();
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || user.role !== "admin") {
      return null;
    }

    return {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export function createAdminToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, isAdmin: true }, JWT_SECRET, {
    expiresIn: "24h",
  });
}
