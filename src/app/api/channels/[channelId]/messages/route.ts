import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { MESSAGES_PER_PAGE, MESSAGE_MAX } from "@/lib/constants";

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
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  const formatted = messages.map((m) => {
    const reactionMap: Record<string, { count: number; userReacted: boolean }> = {};
    for (const r of m.reactions) {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, userReacted: false };
      reactionMap[r.emoji].count++;
      if (r.userId === user.userId) reactionMap[r.emoji].userReacted = true;
    }
    return { ...m, reactions: reactionMap };
  });

  const nextCursor = messages.length === MESSAGES_PER_PAGE ? messages[messages.length - 1].id : null;

  return NextResponse.json({ messages: formatted, nextCursor });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (body.content.length > MESSAGE_MAX) {
    return NextResponse.json({ error: `Message must be ${MESSAGE_MAX} characters or less` }, { status: 400 });
  }

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

  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : undefined;

  const message = await prisma.message.create({
    data: {
      content: body.content.trim(),
      fileUrl,
      authorId: user.userId,
      channelId,
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
