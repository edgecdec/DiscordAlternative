import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { MESSAGES_PER_PAGE } from "@/lib/constants";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

type RouteParams = { params: Promise<{ serverId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const logs = await prisma.auditLog.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ logs });
}
