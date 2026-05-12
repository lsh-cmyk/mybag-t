import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 여러 요일에 동시 아이템 추가
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, days }: { name: string; days: number[] } = await req.json();
  if (!name || !days?.length) {
    return NextResponse.json({ error: "name과 days가 필요합니다." }, { status: 400 });
  }

  // 각 요일의 마지막 order 조회
  const lastItems = await prisma.weeklyItem.groupBy({
    by: ["dayOfWeek"],
    where: { userId: session.user.id, dayOfWeek: { in: days } },
    _max: { order: true },
  });

  const orderMap = new Map(lastItems.map((r) => [r.dayOfWeek, r._max.order ?? -1]));

  const created = await prisma.$transaction(
    days.map((day) =>
      prisma.weeklyItem.create({
        data: {
          userId: session.user.id,
          name,
          dayOfWeek: day,
          order: (orderMap.get(day) ?? -1) + 1,
        },
      })
    )
  );

  return NextResponse.json(created);
}
