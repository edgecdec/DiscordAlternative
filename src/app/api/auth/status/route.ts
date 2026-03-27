import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { USER_STATUSES, UserStatus } from "@/lib/constants";

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status } = body as { status: string };

  if (!status || !USER_STATUSES.includes(status as UserStatus)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${USER_STATUSES.join(", ")}` }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.userId },
    data: { status },
  });

  return NextResponse.json({ status });
}
