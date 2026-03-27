import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CATEGORY_NAME_MIN, CATEGORY_NAME_MAX } from "@/lib/constants";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

type RouteParams = { params: Promise<{ categoryId: string }> };

async function getCategoryAndValidateAdmin(categoryId: string, userId: string) {
  const category = await prisma.channelCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, position: true, serverId: true },
  });
  if (!category) return { error: "Category not found", status: 404 } as const;

  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId: category.serverId } },
  });
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    return { error: "Forbidden", status: 403 } as const;
  }

  return { category } as const;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = await params;
  const result = await getCategoryAndValidateAdmin(categoryId, user.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { name, position } = (await req.json()) as { name?: string; position?: number };

  const data: { name?: string; position?: number } = {};

  if (name !== undefined) {
    if (name.trim().length < CATEGORY_NAME_MIN || name.trim().length > CATEGORY_NAME_MAX) {
      return NextResponse.json(
        { error: `Category name must be ${CATEGORY_NAME_MIN}-${CATEGORY_NAME_MAX} characters` },
        { status: 400 }
      );
    }
    data.name = name.trim();
  }

  if (position !== undefined) {
    if (!Number.isInteger(position) || position < 0) {
      return NextResponse.json({ error: "Position must be a non-negative integer" }, { status: 400 });
    }
    data.position = position;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.channelCategory.update({
    where: { id: categoryId },
    data,
  });

  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = await params;
  const result = await getCategoryAndValidateAdmin(categoryId, user.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await prisma.channelCategory.delete({ where: { id: categoryId } });

  return new NextResponse(null, { status: 204 });
}
