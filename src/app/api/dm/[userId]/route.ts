import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { MESSAGES_PER_PAGE, MESSAGE_MAX } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (userId === user.userId) {
    return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: user.userId, receiverId: userId },
        { senderId: userId, receiverId: user.userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  const nextCursor =
    messages.length === MESSAGES_PER_PAGE
      ? messages[messages.length - 1].id
      : null;

  return NextResponse.json({ messages, nextCursor });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (userId === user.userId) {
    return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({ where: { id: userId } });
  if (!receiver) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (body.content.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Message must be ${MESSAGE_MAX} characters or less` },
      { status: 400 },
    );
  }

  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : undefined;

  const message = await prisma.directMessage.create({
    data: {
      content: body.content.trim(),
      fileUrl,
      senderId: user.userId,
      receiverId: userId,
    },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
