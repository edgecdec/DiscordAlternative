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
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const pins = await prisma.message.findMany({
    where: { channelId, pinned: true, deleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ messages: pins });
}
