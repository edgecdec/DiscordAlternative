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

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
  }

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { inviteCode: true },
  });

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  return NextResponse.json({ inviteCode: server.inviteCode });
}
