import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CATEGORY_NAME_MIN, CATEGORY_NAME_MAX } from "@/lib/constants";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

type RouteParams = { params: Promise<{ serverId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = (await req.json()) as { name?: string };
  if (!name || name.trim().length < CATEGORY_NAME_MIN || name.trim().length > CATEGORY_NAME_MAX) {
    return NextResponse.json(
      { error: `Category name must be ${CATEGORY_NAME_MIN}-${CATEGORY_NAME_MAX} characters` },
      { status: 400 }
    );
  }

  const maxPos = await prisma.channelCategory.aggregate({
    where: { serverId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const category = await prisma.channelCategory.create({
    data: { name: name.trim(), position, serverId },
  });

  return NextResponse.json({ category }, { status: 201 });
}
