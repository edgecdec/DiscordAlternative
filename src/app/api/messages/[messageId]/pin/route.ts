import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const PIN_ROLES = ["OWNER", "ADMIN", "MODERATOR"];

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
    select: { id: true, deleted: true, pinned: true, channelId: true, channel: { select: { serverId: true } } },
  });
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: message.channel.serverId } },
    select: { role: true },
  });
  if (!membership || !PIN_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Not authorized to pin messages" }, { status: 403 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { pinned: !message.pinned },
    include: { author: { select: { id: true, username: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message: updated });
}
