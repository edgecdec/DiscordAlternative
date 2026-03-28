import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { EMOJI_NAME_MIN, EMOJI_NAME_MAX, EMOJI_NAME_PATTERN, EMOJI_MAX_BYTES } from "@/lib/constants";

const ADMIN_ROLES = ["OWNER", "ADMIN"];
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "emoji");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const emoji = await prisma.serverEmoji.findMany({
    where: { serverId },
    orderBy: { createdAt: "asc" },
    include: { uploadedBy: { select: { id: true, username: true } } },
  });

  return NextResponse.json({ emoji });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await params;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.userId, serverId } },
  });
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const name = formData.get("name");
  const file = formData.get("file");

  if (typeof name !== "string" || name.trim().length < EMOJI_NAME_MIN || name.trim().length > EMOJI_NAME_MAX) {
    return NextResponse.json(
      { error: `Emoji name must be ${EMOJI_NAME_MIN}-${EMOJI_NAME_MAX} characters` },
      { status: 400 }
    );
  }

  if (!EMOJI_NAME_PATTERN.test(name.trim())) {
    return NextResponse.json(
      { error: "Emoji name must contain only letters, numbers, and underscores" },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > EMOJI_MAX_BYTES) {
    return NextResponse.json(
      { error: `Emoji image must be under ${EMOJI_MAX_BYTES / 1024}KB` },
      { status: 400 }
    );
  }

  const existing = await prisma.serverEmoji.findUnique({
    where: { serverId_name: { serverId, name: name.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: "An emoji with that name already exists" }, { status: 409 });
  }

  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;

  await mkdir(UPLOADS_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  const imageUrl = `/uploads/emoji/${filename}`;

  const emoji = await prisma.serverEmoji.create({
    data: {
      name: name.trim(),
      imageUrl,
      serverId,
      uploadedById: user.userId,
    },
    include: { uploadedBy: { select: { id: true, username: true } } },
  });

  return NextResponse.json({ emoji }, { status: 201 });
}
