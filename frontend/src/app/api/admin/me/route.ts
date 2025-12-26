import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    const admin = await verifyAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Not authenticated as admin" },
        { status: 401 }
      );
    }

    return NextResponse.json({ admin }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
