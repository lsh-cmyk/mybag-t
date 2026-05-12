import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  // 기본 날씨 규칙 생성
  await prisma.weatherRule.createMany({
    data: [
      { userId: user.id, type: "RAIN", itemName: "우산" },
      { userId: user.id, type: "COLD", itemName: "목도리/패딩" },
      { userId: user.id, type: "DUST", itemName: "마스크" },
    ],
  });

  return NextResponse.json({ ok: true });
}
