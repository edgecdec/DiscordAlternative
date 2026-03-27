import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { MESSAGES_PER_PAGE } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ serverId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: {
      channel: { serverId },
      deleted: false,
      content: { contains: query },
    },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      channel: { select: { id: true, name: true } },
    },
  });

  const nextCursor = messages.length === MESSAGES_PER_PAGE ? messages[messages.length - 1].id : null;

  return NextResponse.json({ messages, nextCursor });
}
