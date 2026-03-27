import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { MESSAGE_MAX } from "@/lib/constants";
import { logAudit } from "@/lib/auditLog";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { authorId: true, deleted: true },
  });
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.authorId !== user.userId) {
    return NextResponse.json({ error: "Only the author can edit this message" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (body.content.length > MESSAGE_MAX) {
    return NextResponse.json({ error: `Message must be ${MESSAGE_MAX} characters or less` }, { status: 400 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: body.content.trim() },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ message: updated });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { authorId: true, deleted: true, channelId: true },
  });
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const channel = await prisma.channel.findUnique({
    where: { id: message.channelId },
    select: { serverId: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const isAuthor = message.authorId === user.userId;

  if (!isAuthor) {
    const membership = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.userId, serverId: channel.serverId } },
      select: { role: true },
    });

    const adminRoles = ["OWNER", "ADMIN"];
    if (!membership || !adminRoles.includes(membership.role)) {
      return NextResponse.json({ error: "Not authorized to delete this message" }, { status: 403 });
    }
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { deleted: true },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  if (!isAuthor) {
    await logAudit(channel.serverId, user.userId, "message_delete", messageId, {
      authorUsername: updated.author.username,
    });
  }

  return NextResponse.json({ message: updated });
}
