import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 일정 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.schedule.delete({
    where: { id: params.id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

// 일정 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, date, items }: { title: string; date: string; items: string[] } = await req.json();

  // 기존 아이템 삭제 후 재생성
  await prisma.scheduleItem.deleteMany({ where: { scheduleId: params.id } });

  const schedule = await prisma.schedule.update({
    where: { id: params.id, userId: session.user.id },
    data: {
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
