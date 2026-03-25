import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "token";
const TOKEN_EXPIRY = "7d";

interface TokenPayload {
  userId: string;
  username: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

export function signToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, getSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as TokenPayload;
    return { userId: decoded.userId, username: decoded.username };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function buildTokenCookie(token: string): string {
  return `${TOKEN_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export function buildClearTokenCookie(): string {
  return `${TOKEN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
