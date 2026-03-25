import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const GUEST_ROLE = "GUEST";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  const server = await prisma.server.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true },
  });

  if (!server) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const existing = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId: server.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const member = await prisma.serverMember.create({
    data: { userId: user.userId, serverId: server.id, role: GUEST_ROLE },
  });

  return NextResponse.json({ server, member }, { status: 201 });
}
