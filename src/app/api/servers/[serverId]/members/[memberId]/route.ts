import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/auditLog";

const VALID_ROLES = ["ADMIN", "MODERATOR", "GUEST"];

type RouteParams = { params: Promise<{ serverId: string; memberId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId, memberId } = await params;

  const requester = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!requester || requester.role !== "OWNER") {
    return NextResponse.json({ error: "Only the server owner can change roles" }, { status: 403 });
  }

  const target = await prisma.serverMember.findUnique({
    where: { id: memberId, serverId },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 400 });
  }

  const { role } = (await req.json()) as { role?: string };
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const updated = await prisma.serverMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });

  await logAudit(serverId, user.userId, "member_role_change", target.userId, {
    username: updated.user.username,
    oldRole: target.role,
    newRole: role,
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId, memberId } = await params;

  const requester = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.serverMember.findUnique({
    where: { id: memberId, serverId },
    include: { user: { select: { username: true } } },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot kick the server owner" }, { status: 400 });
  }

  await prisma.serverMember.delete({ where: { id: memberId } });

  await logAudit(serverId, user.userId, "member_kick", target.userId, {
    username: target.user.username,
  });

  return new NextResponse(null, { status: 204 });
}
