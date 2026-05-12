"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import WeatherBanner from "@/components/WeatherBanner";

interface CheckItem {
  id: string;
  itemName: string;
  source: "WEEKLY" | "WEATHER" | "SCHEDULE" | "MANUAL";
  isChecked: boolean;
  order: number;
}

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

const SOURCE_LABELS: Record<CheckItem["source"], string> = {
  WEEKLY: "요일",
  WEATHER: "날씨",
  SCHEDULE: "일정",
  MANUAL: "직접",
};

const SOURCE_COLORS: Record<CheckItem["source"], string> = {
  WEEKLY: "bg-blue-100 text-blue-700",
  WEATHER: "bg-sky-100 text-sky-700",
  SCHEDULE: "bg-purple-100 text-purple-700",
  MANUAL: "bg-stone-100 text-stone-600",
};

export default function ChecklistPage({ user }: { user: User }) {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const today = new Date();

  // 목록만 새로고침 (generate 없음) — WeatherBanner 콜백용
  const refreshItems = useCallback(async () => {
    const res = await fetch("/api/checklist");
    const data = await res.json();
    setItems(data);
  }, []);

  // 최초 마운트 시: generate → 목록 로드 (한 번만 실행)
  const load = useCallback(async () => {
    await fetch("/api/checklist/generate", { method: "POST" });
    await refreshItems();
    setLoading(false);
  }, [refreshItems]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCheck(id: string, current: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isChecked: !current } : i)));
    await fetch("/api/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isChecked: !current }),
    });
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAdding(true);
    const res = await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemName: newItem.trim() }),
    });
    const item = await res.json();
    setItems((prev) => [...prev, item]);
    setNewItem("");
    setAdding(false);
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/checklist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const checkedCount = items.filter((i) => i.isChecked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-800">🎒 my Bag</h1>
            <p className="text-xs text-stone-500">
              {format(today, "M월 d일 (EEE)", { locale: ko })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/weekly"
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
            >
              요일 설정
            </Link>
            <Link
              href="/schedules"
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
            >
              일정
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs px-3 py-1.5 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* 날씨 배너 */}
        <WeatherBanner onWeatherLoaded={refreshItems} />

        {/* 진행률 */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-stone-700">
                {checkedCount === items.length ? "🎉 완료!" : `${checkedCount} / ${items.length} 완료`}
              </span>
              <span className="text-xs text-stone-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2">
              <div
                className="bg-stone-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 체크리스트 */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-stone-400 text-sm">불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-stone-400 text-sm">오늘 챙길 물건이 없어요</p>
              <p className="text-stone-300 text-xs mt-1">요일 설정에서 아이템을 추가해보세요</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3 group">
                  <button
                    onClick={() => toggleCheck(item.id, item.isChecked)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.isChecked
                        ? "bg-stone-700 border-stone-700 text-white"
                        : "border-stone-300 hover:border-stone-500"
                    }`}
                  >
                    {item.isChecked && (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <span className={`flex-1 text-sm ${item.isChecked ? "line-through text-stone-400" : "text-stone-800"}`}>
                    {item.itemName}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${SOURCE_COLORS[item.source]}`}>
                      {SOURCE_LABELS[item.source]}
                    </span>
                    {item.source === "MANUAL" && (
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 직접 추가 */}
        <form onSubmit={addItem} className="bg-white rounded-2xl border border-stone-200 p-3 flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="오늘만 챙길 물건 추가..."
            className="flex-1 text-sm px-2 py-1.5 focus:outline-none text-stone-700 placeholder:text-stone-300"
          />
          <button
            type="submit"
            disabled={adding || !newItem.trim()}
            className="px-4 py-1.5 bg-stone-800 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-stone-700 transition-colors"
          >
            추가
          </button>
        </form>
      </main>
    </div>
  );
}
