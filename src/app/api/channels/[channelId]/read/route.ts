import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { serverId: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: channel.serverId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const reads = await prisma.channelRead.findMany({
    where: { channelId },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });

  const receipts = reads
    .filter((r) => r.userId !== user.userId)
    .map((r) => ({
      userId: r.user.id,
      username: r.user.username,
      avatarUrl: r.user.avatarUrl,
      lastReadMessageId: r.lastReadMessageId,
    }));

  return NextResponse.json({ receipts });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { serverId: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: channel.serverId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const latestMessage = await prisma.message.findFirst({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!latestMessage) {
    return NextResponse.json({ success: true });
  }

  await prisma.channelRead.upsert({
    where: { userId_channelId: { userId: user.userId, channelId } },
    update: { lastReadMessageId: latestMessage.id },
    create: { userId: user.userId, channelId, lastReadMessageId: latestMessage.id },
  });

  return NextResponse.json({ success: true, lastReadMessageId: latestMessage.id });
}
