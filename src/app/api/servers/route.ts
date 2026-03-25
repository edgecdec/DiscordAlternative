import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const SERVER_NAME_MIN = 1;
const SERVER_NAME_MAX = 100;
const DEFAULT_CHANNEL_NAME = "general";
const DEFAULT_CHANNEL_TYPE = "TEXT";
const OWNER_ROLE = "OWNER";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const servers = await prisma.server.findMany({
    where: { members: { some: { userId: user.userId } } },
    include: {
      channels: true,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ servers });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, imageUrl } = body as { name?: string; imageUrl?: string };

  if (!name || name.trim().length < SERVER_NAME_MIN || name.trim().length > SERVER_NAME_MAX) {
    return NextResponse.json(
      { error: `Server name must be ${SERVER_NAME_MIN}-${SERVER_NAME_MAX} characters` },
      { status: 400 }
    );
  }

  const server = await prisma.server.create({
    data: {
      name: name.trim(),
      imageUrl: imageUrl || null,
      ownerId: user.userId,
      channels: {
        create: { name: DEFAULT_CHANNEL_NAME, type: DEFAULT_CHANNEL_TYPE },
      },
      members: {
        create: { userId: user.userId, role: OWNER_ROLE },
      },
    },
    include: {
      channels: true,
      members: true,
    },
  });

  return NextResponse.json({ server }, { status: 201 });
}
