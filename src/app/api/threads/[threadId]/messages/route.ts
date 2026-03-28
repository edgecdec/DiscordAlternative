import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { MESSAGES_PER_PAGE, MESSAGE_MAX } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

async function getThreadWithAuth(threadId: string, userId: string) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, archived: true, channelId: true, channel: { select: { serverId: true } } },
  });
  if (!thread) return null;

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId: thread.channel.serverId } },
  });
  if (!membership) return null;

  return thread;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const thread = await getThreadWithAuth(threadId, user.userId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      reactions: { select: { emoji: true, userId: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          deleted: true,
          author: { select: { id: true, username: true } },
        },
      },
    },
  });

  const formatted = messages.map((m) => {
    const reactionMap: Record<string, { count: number; userReacted: boolean }> = {};
    for (const r of m.reactions) {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, userReacted: false };
      reactionMap[r.emoji].count++;
      if (r.userId === user.userId) reactionMap[r.emoji].userReacted = true;
    }
    const replyTo = m.replyTo
      ? { id: m.replyTo.id, content: m.replyTo.deleted ? "" : m.replyTo.content, author: m.replyTo.author, deleted: m.replyTo.deleted }
      : null;
    return { ...m, reactions: reactionMap, replyTo };
  });

  const nextCursor = messages.length === MESSAGES_PER_PAGE ? messages[messages.length - 1].id : null;

  return NextResponse.json({ messages: formatted, nextCursor });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const thread = await getThreadWithAuth(threadId, user.userId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 });
  }

  if (thread.archived) {
    return NextResponse.json({ error: "Thread is archived" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (body.content.length > MESSAGE_MAX) {
    return NextResponse.json({ error: `Message must be ${MESSAGE_MAX} characters or less` }, { status: 400 });
  }

  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : undefined;
  const replyToId = typeof body.replyToId === "string" ? body.replyToId : undefined;

  const message = await prisma.message.create({
    data: {
      content: body.content.trim(),
      fileUrl,
      replyToId,
      authorId: user.userId,
      channelId: thread.channelId,
      threadId,
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          deleted: true,
          author: { select: { id: true, username: true } },
        },
      },
    },
  });

  const replyTo = message.replyTo
    ? { id: message.replyTo.id, content: message.replyTo.deleted ? "" : message.replyTo.content, author: message.replyTo.author, deleted: message.replyTo.deleted }
    : null;

  return NextResponse.json({ message: { ...message, replyTo } }, { status: 201 });
}
