import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchWeather, fetchDust, getWeatherItems } from "@/lib/weather";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { weatherRules: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 위치 미설정 시 서울 기본값
  const nx = user.locationNx ?? 60;
  const ny = user.locationNy ?? 127;
  const stationName = user.locationName ?? "종로구";

  try {
    const weather = await fetchWeather(nx, ny);
    const dust = await fetchDust(stationName);
    weather.dustLevel = dust.level;
    weather.dustGrade = dust.grade;

    const triggeredItems = getWeatherItems(weather, user.weatherRules, {
      rain: user.rainThreshold,
      temp: user.tempThreshold,
      dust: user.dustThreshold,
    });

    return NextResponse.json({ weather, triggeredItems });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ weather: null, triggeredItems: [], error: "날씨 정보를 가져올 수 없습니다." });
  }
}

// 날씨 기반 아이템을 오늘 체크리스트에 추가
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items }: { items: { itemName: string; type: string }[] } = await req.json();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 이미 날씨 기반 아이템이 있으면 삭제 후 재생성
  await prisma.dailyCheck.deleteMany({
    where: { userId: session.user.id, date: today, source: "WEATHER" },
  });

  if (items.length === 0) return NextResponse.json({ ok: true });

  const lastItem = await prisma.dailyCheck.findFirst({
    where: { userId: session.user.id, date: today },
    orderBy: { order: "desc" },
  });
  let order = (lastItem?.order ?? -1) + 1;

  await prisma.dailyCheck.createMany({
    data: items.map(({ itemName }) => ({
      userId: session.user.id,
      date: today,
      itemName,
      source: "WEATHER" as const,
      order: order++,
    })),
  });

  return NextResponse.json({ ok: true, added: items.length });
}
