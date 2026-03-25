import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, buildTokenCookie } from "@/lib/auth";

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;
const BCRYPT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, email, password } = body as {
    username?: string;
    email?: string;
    password?: string;
  };

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

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  if (!password || password.length < PASSWORD_MIN) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    const field = existing.username === username ? "Username" : "Email";
    return NextResponse.json(
      { error: `${field} already taken` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, passwordHash },
  });

  const token = signToken(user.id, user.username);

  return NextResponse.json(
    { user: { id: user.id, username: user.username, email: user.email } },
    {
      status: 201,
      headers: { "Set-Cookie": buildTokenCookie(token) },
    }
  );
}
