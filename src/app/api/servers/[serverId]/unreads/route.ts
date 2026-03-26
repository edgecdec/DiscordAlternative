import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ serverId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const channels = await prisma.channel.findMany({
    where: { serverId, type: "TEXT" },
    select: { id: true },
  });

  const channelIds = channels.map((c) => c.id);
  if (channelIds.length === 0) {
    return NextResponse.json({ unreads: {} });
  }

  const reads = await prisma.channelRead.findMany({
    where: { userId: user.userId, channelId: { in: channelIds } },
    select: { channelId: true, lastReadMessageId: true },
  });

  const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadMessageId]));

  const unreads: Record<string, boolean> = {};

  for (const chId of channelIds) {
    const lastReadId = readMap.get(chId);
    if (!lastReadId) {
      // Never read — unread if any messages exist
      const count = await prisma.message.count({
        where: { channelId: chId, deleted: false },
      });
      unreads[chId] = count > 0;
    } else {
      // Check if any message exists after the last read message
      const lastRead = await prisma.message.findUnique({
        where: { id: lastReadId },
        select: { createdAt: true },
      });
      if (!lastRead) {
        unreads[chId] = false;
        continue;
      }
      const newer = await prisma.message.count({
        where: {
          channelId: chId,
          deleted: false,
          createdAt: { gt: lastRead.createdAt },
        },
      });
      unreads[chId] = newer > 0;
    }
  }

  return NextResponse.json({ unreads });
}
