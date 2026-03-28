import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ serverId: string; emojiId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId, emojiId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emoji = await prisma.serverEmoji.findUnique({ where: { id: emojiId } });
  if (!emoji || emoji.serverId !== serverId) {
    return NextResponse.json({ error: "Emoji not found" }, { status: 404 });
  }

  await prisma.serverEmoji.delete({ where: { id: emojiId } });

  const filePath = path.join(process.cwd(), emoji.imageUrl);
  await unlink(filePath).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
