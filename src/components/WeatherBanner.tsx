"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  rainProb: number;
  minTemp: number;
  currentTemp: number;
  dustLevel: number;
  dustGrade: number;
}

interface TriggeredItem {
  itemName: string;
  type: string;
}

const DUST_LABELS = ["", "좋음", "보통", "나쁨", "매우나쁨"];
const DUST_COLORS = ["", "text-blue-500", "text-green-500", "text-orange-500", "text-red-500"];

export default function WeatherBanner({ onWeatherLoaded }: { onWeatherLoaded?: () => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [triggered, setTriggered] = useState<TriggeredItem[]>([]);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/weather");
      const data = await res.json();
      if (data.weather) {
        setWeather(data.weather);
        setTriggered(data.triggeredItems ?? []);
        // 날씨 아이템 자동 적용
        if (data.triggeredItems?.length > 0) {
          await fetch("/api/weather", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: data.triggeredItems }),
          });
          setApplied(true);
          onWeatherLoaded?.();
        }
      } else {
        setError(data.error || "날씨 정보 없음");
      }
    }
    load();
  }, [onWeatherLoaded]);

  if (error) return null;
  if (!weather) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-3 animate-pulse">
        <div className="h-4 bg-stone-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-stone-600">
            🌡 <span className="font-medium">{weather.currentTemp}°</span>
            <span className="text-stone-400 text-xs ml-1">(최저 {weather.minTemp}°)</span>
          </span>
          <span className="text-stone-600">
            ☔ <span className="font-medium">{weather.rainProb}%</span>
          </span>
          {weather.dustGrade > 0 && (
            <span className={DUST_COLORS[weather.dustGrade]}>
              💨 <span className="font-medium">{DUST_LABELS[weather.dustGrade]}</span>
            </span>
          )}
        </div>
      </div>

      {triggered.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {triggered.map((item, i) => (
            <span key={i} className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-200">
              {item.itemName} 추가됨
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
