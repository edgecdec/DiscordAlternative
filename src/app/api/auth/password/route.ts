import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PASSWORD_MIN, PASSWORD_MAX, BCRYPT_ROUNDS } from "@/lib/constants";

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "currentPassword and newPassword are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
    return NextResponse.json(
      { error: `New password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: auth.userId }, data: { passwordHash } });

  return NextResponse.json({ message: "Password updated" });
}
