import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 오늘의 체크리스트 조회
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checks = await prisma.dailyCheck.findMany({
    where: { userId: session.user.id, date: today },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(checks);
}

// 아이템 체크/언체크
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, isChecked } = await req.json();

  const check = await prisma.dailyCheck.update({
    where: { id, userId: session.user.id },
    data: { isChecked },
  });

  return NextResponse.json(check);
}

// 직접 추가
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemName } = await req.json();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastItem = await prisma.dailyCheck.findFirst({
    where: { userId: session.user.id, date: today },
    orderBy: { order: "desc" },
  });

  const check = await prisma.dailyCheck.create({
    data: {
      userId: session.user.id,
      date: today,
      itemName,
      source: "MANUAL",
      order: (lastItem?.order ?? -1) + 1,
    },
  });

  return NextResponse.json(check);
}

// 아이템 삭제 (MANUAL만)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  await prisma.dailyCheck.delete({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
