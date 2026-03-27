import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CHANNEL_NAME_MIN, CHANNEL_NAME_MAX } from "@/lib/constants";
import { logAudit } from "@/lib/auditLog";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

type RouteParams = { params: Promise<{ channelId: string }> };

async function getChannelAndValidateAdmin(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, type: true, serverId: true },
  });
  if (!channel) return { error: "Channel not found", status: 404 } as const;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId: channel.serverId } },
  });
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return { error: "Forbidden", status: 403 } as const;
  }

  return { channel } as const;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;
  const result = await getChannelAndValidateAdmin(channelId, user.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { name } = (await req.json()) as { name?: string };
  if (!name || name.trim().length < CHANNEL_NAME_MIN || name.trim().length > CHANNEL_NAME_MAX) {
    return NextResponse.json(
      { error: `Channel name must be ${CHANNEL_NAME_MIN}-${CHANNEL_NAME_MAX} characters` },
      { status: 400 }
    );
  }

  const updated = await prisma.channel.update({
    where: { id: channelId },
    data: { name: name.trim() },
  });

  return NextResponse.json({ channel: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await params;
  const result = await getChannelAndValidateAdmin(channelId, user.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const textChannelCount = await prisma.channel.count({
    where: { serverId: result.channel.serverId, type: "TEXT" },
  });

  if (result.channel.type === "TEXT" && textChannelCount <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last text channel" },
      { status: 400 }
    );
  }

  await prisma.channel.delete({ where: { id: channelId } });

  await logAudit(result.channel.serverId, user.userId, "channel_delete", channelId, {
    name: result.channel.name,
    type: result.channel.type,
  });

  return new NextResponse(null, { status: 204 });
}
