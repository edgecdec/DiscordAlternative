import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VOICE_TYPES = ["VOICE", "VIDEO"] as const;
const TOKEN_TTL = "1h";
const ROOM_PREFIX = "channel:";
const IDENTITY_PREFIX = "user:";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { channelId } = body as { channelId?: string };

  if (!channelId) {
    return NextResponse.json({ error: "channelId is required" }, { status: 400 });
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, type: true, serverId: true },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!VOICE_TYPES.includes(channel.type as (typeof VOICE_TYPES)[number])) {
    return NextResponse.json({ error: "Channel is not a voice/video channel" }, { status: 400 });
  }

  const membership = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: channel.serverId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: `${IDENTITY_PREFIX}${user.userId}`, name: user.username, ttl: TOKEN_TTL },
  );

  at.addGrant({
    room: `${ROOM_PREFIX}${channelId}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token });
}
