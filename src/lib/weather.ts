import { format } from "date-fns";

export interface WeatherData {
  rainProb: number;       // 강수확률 (%)
  minTemp: number;        // 최저기온 (°C)
  currentTemp: number;    // 현재기온
  dustLevel: number;      // 미세먼지 (μg/m³)
  dustGrade: number;      // 미세먼지 등급 (1=좋음, 2=보통, 3=나쁨, 4=매우나쁨)
}

// 기상청 단기예보 API (초단기예보 + 단기예보 조합)
export async function fetchWeather(nx: number, ny: number): Promise<WeatherData> {
  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey) throw new Error("KMA_API_KEY not set");

  const now = new Date();
  const baseDate = format(now, "yyyyMMdd");

  // 발표 시각 계산 (단기예보: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300)
  const hours = now.getHours();
  const forecastTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseTime = "2300";
  let usedDate = baseDate;

  for (let i = forecastTimes.length - 1; i >= 0; i--) {
    if (hours >= forecastTimes[i]) {
      baseTime = String(forecastTimes[i]).padStart(2, "0") + "00";
      break;
    }
  }
  // 자정~02시 사이면 전날 23시 예보 사용
  if (hours < 2) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    usedDate = format(yesterday, "yyyyMMdd");
    baseTime = "2300";
  }

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: "1",
    numOfRows: "300",
    dataType: "JSON",
    base_date: usedDate,
    base_time: baseTime,
    nx: String(nx),
    ny: String(ny),
  });

  const res = await fetch(
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${params}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`KMA API error: ${res.status}`);
  const json = await res.json();
  const items: { category: string; fcstValue: string; fcstDate: string; fcstTime: string }[] =
    json?.response?.body?.items?.item ?? [];

  const todayStr = baseDate;
  const todayItems = items.filter((i) => i.fcstDate === todayStr);

  // POP: 강수확률, TMN: 최저기온, TMP: 기온
  const popValues = todayItems.filter((i) => i.category === "POP").map((i) => parseInt(i.fcstValue));
  const tmnItem = todayItems.find((i) => i.category === "TMN");
  const tmpValues = todayItems.filter((i) => i.category === "TMP").map((i) => parseFloat(i.fcstValue));

  const rainProb = popValues.length > 0 ? Math.max(...popValues) : 0;
  const minTemp = tmnItem ? parseFloat(tmnItem.fcstValue) : (tmpValues.length > 0 ? Math.min(...tmpValues) : 20);
  const currentTemp = tmpValues.length > 0 ? tmpValues[0] : 20;

  return { rainProb, minTemp, currentTemp, dustLevel: 0, dustGrade: 1 };
}

// AirKorea 미세먼지 API
export async function fetchDust(stationName: string): Promise<{ level: number; grade: number }> {
  const apiKey = process.env.AIRKOREA_API_KEY;
  if (!apiKey) return { level: 0, grade: 1 };

  const params = new URLSearchParams({
    serviceKey: apiKey,
    returnType: "json",
    numOfRows: "1",
    pageNo: "1",
    stationName,
    dataTerm: "DAILY",
    ver: "1.0",
  });

  const res = await fetch(
    `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?${params}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) return { level: 0, grade: 1 };
  const json = await res.json();
  const item = json?.response?.body?.items?.[0];
  if (!item) return { level: 0, grade: 1 };

  const level = parseInt(item.pm10Value) || 0;
  const grade = parseInt(item.pm10Grade) || 1;
  return { level, grade };
}

// 날씨 규칙에 따른 아이템 판단
export function getWeatherItems(
  weather: WeatherData,
  rules: { type: string; itemName: string; isActive: boolean }[],
  thresholds: { rain: number; temp: number; dust: number }
): { itemName: string; type: string }[] {
  const result: { itemName: string; type: string }[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    if (rule.type === "RAIN" && weather.rainProb >= thresholds.rain) {
      result.push({ itemName: rule.itemName, type: "RAIN" });
    } else if (rule.type === "COLD" && weather.minTemp <= thresholds.temp) {
      result.push({ itemName: rule.itemName, type: "COLD" });
    } else if (rule.type === "DUST" && weather.dustLevel >= thresholds.dust) {
      result.push({ itemName: rule.itemName, type: "DUST" });
    }
  }

  return result;
}
