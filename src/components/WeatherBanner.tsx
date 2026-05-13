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

const WEATHER_RULES = [
  { icon: "☔", label: "강수확률 40% 이상", item: "우산" },
  { icon: "🧣", label: "최저기온 5°C 이하", item: "목도리/패딩" },
  { icon: "😷", label: "미세먼지 나쁨 이상", item: "마스크" },
];

export default function WeatherBanner({ onWeatherLoaded }: { onWeatherLoaded?: () => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [triggered, setTriggered] = useState<TriggeredItem[]>([]);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/weather");
      const data = await res.json();
      if (data.weather) {
        setWeather(data.weather);
        setTriggered(data.triggeredItems ?? []);
        if (data.triggeredItems?.length > 0) {
          await fetch("/api/weather", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: data.triggeredItems }),
          });
          onWeatherLoaded?.();
        }
      } else {
        setError(data.error || "날씨 정보 없음");
      }
    }
    load();
  }, [onWeatherLoaded]);

  if (error) return null;

  // 로딩 중
  if (!weather) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-3 animate-pulse">
        <div className="h-4 bg-stone-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* 날씨 정보 행 */}
      <div className="px-4 py-3 flex items-center justify-between">
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
        {/* 안내 토글 버튼 */}
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors"
          title="자동 추가 안내"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8" cy="8" r="6.5"/>
            <path d="M8 7v4M8 5.5v.5" strokeLinecap="round"/>
          </svg>
          자동 추가 안내
        </button>
      </div>

      {/* 자동 추가된 아이템 뱃지 */}
      {triggered.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {triggered.map((item, i) => (
            <span key={i} className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-200">
              ✓ {item.itemName} 자동 추가됨
            </span>
          ))}
        </div>
      )}

      {/* 안내 패널 */}
      {showGuide && (
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-3">
          <p className="text-xs font-semibold text-stone-600 mb-2">🤖 날씨 조건에 따라 준비물이 자동으로 추가돼요</p>
          <ul className="space-y-1.5">
            {WEATHER_RULES.map((rule) => (
              <li key={rule.item} className="flex items-center gap-2 text-xs text-stone-500">
                <span className="text-base leading-none">{rule.icon}</span>
                <span>
                  <span className="font-medium text-stone-700">{rule.label}</span>
                  {" → "}
                  <span className="text-stone-500">{rule.item}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-400 mt-2">설정에서 임계값과 아이템명을 변경할 수 있어요.</p>
        </div>
      )}
    </div>
  );
}
