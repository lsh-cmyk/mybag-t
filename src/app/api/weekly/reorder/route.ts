import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 드래그 순서 재정렬
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items }: { items: { id: string; order: number }[] } = await req.json();

  await prisma.$transaction(
    items.map(({ id, order }) =>
      prisma.weeklyItem.update({
        where: { id, userId: session.user.id },
        data: { order },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
