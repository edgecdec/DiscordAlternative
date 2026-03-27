import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all DMs involving this user, grouped by the other participant
  const sent = await prisma.directMessage.findMany({
    where: { senderId: user.userId },
    select: { receiverId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const received = await prisma.directMessage.findMany({
    where: { receiverId: user.userId },
    select: { senderId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // Build map of other userId -> latest message time
  const latestMap = new Map<string, Date>();
  for (const m of sent) {
    const existing = latestMap.get(m.receiverId);
    if (!existing || m.createdAt > existing) latestMap.set(m.receiverId, m.createdAt);
  }
  for (const m of received) {
    const existing = latestMap.get(m.senderId);
    if (!existing || m.createdAt > existing) latestMap.set(m.senderId, m.createdAt);
  }

  const userIds = Array.from(latestMap.keys());
  if (userIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatarUrl: true },
  });

  const conversations = users
    .map((u) => ({
      user: u,
      lastMessageAt: latestMap.get(u.id)!.toISOString(),
    }))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  return NextResponse.json({ conversations });
}
