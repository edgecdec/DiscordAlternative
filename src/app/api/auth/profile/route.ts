import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, signToken, buildTokenCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  USERNAME_MIN,
  USERNAME_MAX,
  USERNAME_PATTERN,
  AVATAR_URL_MAX,
} from "@/lib/constants";

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { username, avatarUrl } = body as {
    username?: string;
    avatarUrl?: string | null;
  };

  const data: { username?: string; avatarUrl?: string | null } = {};

  if (username !== undefined) {
    if (
      !username ||
      username.length < USERNAME_MIN ||
      username.length > USERNAME_MAX ||
      !USERNAME_PATTERN.test(username)
    ) {
      return NextResponse.json(
        { error: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} alphanumeric characters` },
        { status: 400 }
      );
    }

    if (username !== auth.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    data.username = username;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && avatarUrl.length > AVATAR_URL_MAX) {
      return NextResponse.json(
        { error: `Avatar URL must be at most ${AVATAR_URL_MAX} characters` },
        { status: 400 }
      );
    }
    data.avatarUrl = avatarUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    select: { id: true, username: true, avatarUrl: true },
    data,
  });

  const headers: HeadersInit = {};
  if (data.username) {
    const token = signToken(user.id, user.username);
    headers["Set-Cookie"] = buildTokenCookie(token);
  }

  return NextResponse.json({ user }, { headers });
}
