import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";

type RouteParams = { params: Promise<{ serverId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bans = await prisma.bannedUser.findMany({
    where: { serverId },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      bannedBy: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bans });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, reason } = (await req.json()) as { userId?: string; reason?: string };
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  if (userId === user.userId) {
    return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
  }

  const target = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId } },
    include: { user: { select: { username: true } } },
  });

  if (target?.role === "OWNER") {
    return NextResponse.json({ error: "Cannot ban the server owner" }, { status: 400 });
  }

  const existing = await prisma.bannedUser.findUnique({
    where: { userId_serverId: { userId, serverId } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already banned" }, { status: 409 });
  }

  const targetUser = target?.user ?? await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.bannedUser.create({
      data: { userId, serverId, reason: reason || null, bannedById: user.userId },
    });
    if (target) {
      await tx.serverMember.delete({
        where: { userId_serverId: { userId, serverId } },
      });
    }
  });

  await logAudit(serverId, user.userId, "member_ban", userId, {
    username: targetUser.username,
    reason: reason || null,
  });

  return NextResponse.json({ banned: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const ban = await prisma.bannedUser.findUnique({
    where: { userId_serverId: { userId, serverId } },
  });
  if (!ban) return NextResponse.json({ error: "User is not banned" }, { status: 404 });

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  await prisma.bannedUser.delete({
    where: { userId_serverId: { userId, serverId } },
  });

  await logAudit(serverId, user.userId, "member_unban", userId, {
    username: targetUser?.username ?? "unknown",
  });

  return new NextResponse(null, { status: 204 });
}
