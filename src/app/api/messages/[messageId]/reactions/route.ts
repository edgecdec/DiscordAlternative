import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.emoji !== "string" || !body.emoji.trim()) {
    return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
  }

  const emoji = body.emoji.trim();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, deleted: true, channel: { select: { serverId: true } } },
  });
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: message.channel.serverId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const existing = await prisma.reaction.findUnique({
    where: { userId_messageId_emoji: { userId: user.userId, messageId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed", emoji });
  }

  await prisma.reaction.create({
    data: { emoji, userId: user.userId, messageId },
  });

  return NextResponse.json({ action: "added", emoji });
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, deleted: true, channel: { select: { serverId: true } } },
  });
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: message.channel.serverId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const reactions = await prisma.reaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });

  const grouped: Record<string, { count: number; userReacted: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { count: 0, userReacted: false };
    }
    grouped[r.emoji].count++;
    if (r.userId === user.userId) {
      grouped[r.emoji].userReacted = true;
    }
  }

  return NextResponse.json({ reactions: grouped });
}
