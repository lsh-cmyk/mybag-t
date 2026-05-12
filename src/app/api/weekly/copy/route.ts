import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 한 요일의 아이템을 다른 요일들로 복사
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fromDay, toDays }: { fromDay: number; toDays: number[] } = await req.json();
  if (fromDay === undefined || !toDays?.length) {
    return NextResponse.json({ error: "fromDay와 toDays가 필요합니다." }, { status: 400 });
  }

  // 복사할 원본 아이템
  const sourceItems = await prisma.weeklyItem.findMany({
    where: { userId: session.user.id, dayOfWeek: fromDay },
    orderBy: { order: "asc" },
  });

  if (sourceItems.length === 0) {
    return NextResponse.json({ copied: 0 });
  }

  // 대상 요일의 마지막 order 조회
  const lastItems = await prisma.weeklyItem.groupBy({
    by: ["dayOfWeek"],
    where: { userId: session.user.id, dayOfWeek: { in: toDays } },
    _max: { order: true },
  });
  const orderMap = new Map(lastItems.map((r) => [r.dayOfWeek, r._max.order ?? -1]));

  // 각 대상 요일에 원본 아이템 복사 (이름 중복 제외)
  const existingItems = await prisma.weeklyItem.findMany({
    where: { userId: session.user.id, dayOfWeek: { in: toDays } },
    select: { dayOfWeek: true, name: true },
  });
  const existingSet = new Set(existingItems.map((i) => `${i.dayOfWeek}:${i.name}`));

  const toCreate = toDays.flatMap((day) => {
    let order = orderMap.get(day) ?? -1;
    return sourceItems
      .filter((item) => !existingSet.has(`${day}:${item.name}`))
      .map((item) => ({
        userId: session.user.id,
        name: item.name,
        dayOfWeek: day,
        order: ++order,
        isActive: item.isActive,
      }));
  });

  if (toCreate.length > 0) {
    await prisma.weeklyItem.createMany({ data: toCreate });
  }

  return NextResponse.json({ copied: toCreate.length });
}
