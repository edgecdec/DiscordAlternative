import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { FILE_UPLOAD_MAX_BYTES } from "@/lib/constants";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > FILE_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds maximum size of ${FILE_UPLOAD_MAX_BYTES / (1024 * 1024)}MB` },
      { status: 400 },
    );
  }

  const ext = path.extname(file.name) || "";
  const filename = `${randomUUID()}${ext}`;

  await mkdir(UPLOADS_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
