import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CHANNEL_NAME_MIN, CHANNEL_NAME_MAX } from "@/lib/constants";

const VALID_CHANNEL_TYPES = ["TEXT", "VOICE", "VIDEO"] as const;
const ADMIN_ROLES = ["OWNER", "ADMIN"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
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
  const { name, type, categoryId } = body as { name?: string; type?: string; categoryId?: string };

  if (!name || name.trim().length < CHANNEL_NAME_MIN || name.trim().length > CHANNEL_NAME_MAX) {
    return NextResponse.json(
      { error: `Channel name must be ${CHANNEL_NAME_MIN}-${CHANNEL_NAME_MAX} characters` },
      { status: 400 }
    );
  }

  if (!type || !VALID_CHANNEL_TYPES.includes(type as typeof VALID_CHANNEL_TYPES[number])) {
    return NextResponse.json(
      { error: `Channel type must be one of: ${VALID_CHANNEL_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (categoryId) {
    const category = await prisma.channelCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.serverId !== serverId) {
      return NextResponse.json({ error: "Category not found in this server" }, { status: 400 });
    }
  }

  const channel = await prisma.channel.create({
    data: {
      name: name.trim(),
      type,
      serverId,
      ...(categoryId ? { categoryId } : {}),
    },
  });

  return NextResponse.json({ channel }, { status: 201 });
}
