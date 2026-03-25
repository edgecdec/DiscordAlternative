import { NextResponse } from "next/server";
import { buildClearTokenCookie } from "@/lib/auth";

export async function POST() {
  return NextResponse.json(
    { success: true },
    { headers: { "Set-Cookie": buildClearTokenCookie() } }
  );
}
