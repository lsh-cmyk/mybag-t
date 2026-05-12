import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 일정 목록 조회
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const schedules = await prisma.schedule.findMany({
    where: {
      userId: session.user.id,
      ...(from && to
        ? { date: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(schedules);
}

// 일정 생성
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, date, items }: { title: string; date: string; items: string[] } = await req.json();

  if (!title || !date) {
    return NextResponse.json({ error: "제목과 날짜를 입력해주세요." }, { status: 400 });
  }

  const schedule = await prisma.schedule.create({
    data: {
      userId: session.user.id,
      title,
      date: new Date(date),
      items: {
        create: items.map((name, order) => ({ name, order })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(schedule);
}
