import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { SERVER_NAME_MIN, SERVER_NAME_MAX, AVATAR_URL_MAX } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ serverId: string }>;
}

const ADMIN_ROLES = ["OWNER", "ADMIN"];

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: {
      channels: { orderBy: { createdAt: "asc" } },
      members: {
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  return NextResponse.json({ server });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });

  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, imageUrl } = body as { name?: string; imageUrl?: string };

  const data: { name?: string; imageUrl?: string } = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length < SERVER_NAME_MIN || trimmed.length > SERVER_NAME_MAX) {
      return NextResponse.json(
        { error: `Server name must be ${SERVER_NAME_MIN}-${SERVER_NAME_MAX} characters` },
        { status: 400 }
      );
    }
    data.name = trimmed;
  }

  if (imageUrl !== undefined) {
    if (imageUrl.length > AVATAR_URL_MAX) {
      return NextResponse.json(
        { error: `Image URL must be at most ${AVATAR_URL_MAX} characters` },
        { status: 400 }
      );
    }
    data.imageUrl = imageUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const server = await prisma.server.update({
    where: { id: serverId },
    data,
  });

  return NextResponse.json({ server });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });

  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.server.delete({ where: { id: serverId } });

  return new NextResponse(null, { status: 204 });
}
