"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";

interface ScheduleItem {
  id: string;
  name: string;
  order: number;
}

interface Schedule {
  id: string;
  title: string;
  date: string;
  items: ScheduleItem[];
}

export default function SchedulesClient() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const from = startOfMonth(currentMonth).toISOString();
    const to = endOfMonth(currentMonth).toISOString();
    const res = await fetch(`/api/schedules?from=${from}&to=${to}`);
    const data = await res.json();
    setSchedules(data);
  }, [currentMonth]);

  useEffect(() => { load(); }, [load]);

  const selectedSchedules = schedules.filter(
    (s) => selectedDate && isSameDay(new Date(s.date), selectedDate)
  );

  async function deleteSchedule(id: string) {
    if (!confirm("일정을 삭제할까요?")) return;
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  const datesWithSchedule = new Set(
    schedules.map((s) => format(new Date(s.date), "yyyy-MM-dd"))
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-stone-400 hover:text-stone-600">←</Link>
            <h1 className="text-base font-bold text-stone-800">일정 관리</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
          >
            + 일정 추가
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* 월 캘린더 */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-stone-400 hover:text-stone-700 p-1">
              ‹
            </button>
            <span className="font-semibold text-stone-800 text-sm">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-stone-400 hover:text-stone-700 p-1">
              ›
            </button>
          </div>

          <MiniCalendar
            month={currentMonth}
            datesWithSchedule={datesWithSchedule}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>

        {/* 선택된 날짜의 일정 */}
        {selectedDate && (
          <div>
            <h2 className="text-sm font-medium text-stone-500 mb-2 px-1">
              {format(selectedDate, "M월 d일 (EEE)", { locale: ko })} 일정
            </h2>
            {selectedSchedules.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
                <p className="text-stone-400 text-sm">이날 등록된 일정이 없어요</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 text-xs text-stone-500 hover:text-stone-700 underline"
                >
                  일정 추가하기
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSchedules.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} onDelete={deleteSchedule} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 일정 추가 모달 */}
      {showForm && (
        <ScheduleForm
          defaultDate={selectedDate ?? new Date()}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function MiniCalendar({
  month,
  datesWithSchedule,
  selectedDate,
  onSelect,
}: {
  month: Date;
  datesWithSchedule: Set<string>;
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const startDow = start.getDay();
  const totalDays = end.getDate();
  const days = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {days.map((d) => (
          <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: totalDays }).map((_, i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const key = format(date, "yyyy-MM-dd");
          const hasSchedule = datesWithSchedule.has(key);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                isSelected ? "bg-stone-800 text-white" : isToday ? "text-stone-800 font-bold" : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="text-xs">{i + 1}</span>
              {hasSchedule && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-stone-400"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleCard({ schedule, onDelete }: { schedule: Schedule; onDelete: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-stone-800 text-sm">{schedule.title}</h3>
          <div className="mt-2 space-y-1">
            {schedule.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                {item.name}
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => onDelete(schedule.id)}
          className="text-stone-300 hover:text-red-400 transition-colors text-lg leading-none ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function ScheduleForm({
  defaultDate,
  onClose,
  onSaved,
}: {
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [items, setItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addItemField() {
    setItems((prev) => [...prev, ""]);
  }

  function removeItemField(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((v) => v.trim());
    if (!title.trim()) { setError("일정 제목을 입력해주세요."); return; }

    setSaving(true);
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), date, items: validItems }),
    });

    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error || "저장에 실패했습니다.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800">일정 추가</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">일정 제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 병원 방문, 헬스장, 출장..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">챙길 물건</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateItem(i, e.target.value)}
                    placeholder={`물건 ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemField(i)}
                      className="text-stone-300 hover:text-red-400 px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addItemField}
                className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> 물건 추가
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
