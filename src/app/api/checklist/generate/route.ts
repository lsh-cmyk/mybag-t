import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 오늘 체크리스트 자동 생성 (요일 + 일정 기반)
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0=일, 6=토

  // 이미 생성된 항목이 있으면 건너뜀
  const existing = await prisma.dailyCheck.count({
    where: { userId: session.user.id, date: today, source: { not: "MANUAL" } },
  });
  if (existing > 0) return NextResponse.json({ ok: true, skipped: true });

  const items: { itemName: string; source: "WEEKLY" | "SCHEDULE"; sourceId: string; order: number }[] = [];
  let order = 0;

  // 요일 고정 아이템
  const weeklyItems = await prisma.weeklyItem.findMany({
    where: { userId: session.user.id, dayOfWeek, isActive: true },
    orderBy: { order: "asc" },
  });
  for (const item of weeklyItems) {
    items.push({ itemName: item.name, source: "WEEKLY", sourceId: item.id, order: order++ });
  }

  // 오늘 일정 아이템
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const schedules = await prisma.schedule.findMany({
    where: {
      userId: session.user.id,
      date: { gte: today, lt: tomorrow },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  for (const schedule of schedules) {
    for (const item of schedule.items) {
      items.push({ itemName: item.name, source: "SCHEDULE", sourceId: item.id, order: order++ });
    }
  }

  if (items.length > 0) {
    // skipDuplicates: true — 경쟁 조건(race condition)으로 인한 중복 insert 방어
    await prisma.dailyCheck.createMany({
      data: items.map((item) => ({
        userId: session.user.id,
        date: today,
        ...item,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, created: items.length });
}
