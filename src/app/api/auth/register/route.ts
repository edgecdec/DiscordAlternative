import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, buildTokenCookie } from "@/lib/auth";
import {
  USERNAME_MIN,
  USERNAME_MAX,
  USERNAME_PATTERN,
  PASSWORD_MIN,
  PASSWORD_MAX,
  BCRYPT_ROUNDS,
} from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body as { username?: string; password?: string };

  if (
    !username ||
    username.length < USERNAME_MIN ||
    username.length > USERNAME_MAX ||
    !USERNAME_PATTERN.test(username)
  ) {
    return NextResponse.json(
      { error: "Username must be 3-20 alphanumeric characters" },
      { status: 400 }
    );
  }

  if (!password || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return NextResponse.json(
      { error: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { username, passwordHash } });
  const token = signToken(user.id, user.username);

  return NextResponse.json(
    { user: { id: user.id, username: user.username } },
    { status: 201, headers: { "Set-Cookie": buildTokenCookie(token) } }
  );
}
