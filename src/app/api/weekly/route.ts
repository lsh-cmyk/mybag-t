import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 요일별 아이템 조회
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day");

  const items = await prisma.weeklyItem.findMany({
    where: {
      userId: session.user.id,
      ...(day !== null ? { dayOfWeek: parseInt(day) } : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }],
  });

  return NextResponse.json(items);
}

// 아이템 추가
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, dayOfWeek } = await req.json();

  const last = await prisma.weeklyItem.findFirst({
    where: { userId: session.user.id, dayOfWeek },
    orderBy: { order: "desc" },
  });

  const item = await prisma.weeklyItem.create({
    data: {
      userId: session.user.id,
      name,
      dayOfWeek,
      order: (last?.order ?? -1) + 1,
    },
  });

  return NextResponse.json(item);
}

// 아이템 수정 (isActive 토글, 이름 변경)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, isActive, order } = await req.json();

  const item = await prisma.weeklyItem.update({
    where: { id, userId: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(isActive !== undefined && { isActive }),
      ...(order !== undefined && { order }),
    },
  });

  return NextResponse.json(item);
}

// 아이템 삭제
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  await prisma.weeklyItem.delete({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
