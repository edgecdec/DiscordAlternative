import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { THREAD_NAME_MIN, THREAD_NAME_MAX } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      deleted: true,
      content: true,
      channelId: true,
      threadId: true,
      channel: { select: { serverId: true } },
      spawnedThread: { select: { id: true } },
    },
  });
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.threadId) {
    return NextResponse.json({ error: "Cannot create a thread from a thread message" }, { status: 400 });
  }

  if (message.spawnedThread) {
    return NextResponse.json({ thread: message.spawnedThread }, { status: 200 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: message.channel.serverId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const rawName = body?.name;
  const name =
    typeof rawName === "string" && rawName.trim().length >= THREAD_NAME_MIN
      ? rawName.trim().slice(0, THREAD_NAME_MAX)
      : message.content.slice(0, THREAD_NAME_MAX) || "Thread";

  const thread = await prisma.thread.create({
    data: {
      name,
      parentMessageId: messageId,
      channelId: message.channelId,
      creatorId: user.userId,
    },
    include: {
      creator: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ thread }, { status: 201 });
}
