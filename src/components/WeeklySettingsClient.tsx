"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

interface WeeklyItem {
  id: string;
  name: string;
  dayOfWeek: number;
  order: number;
  isActive: boolean;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ─── 요일 체크박스 선택기 ───────────────────────────────────────────
function DayCheckboxes({
  selected,
  onChange,
  exclude,
}: {
  selected: number[];
  onChange: (days: number[]) => void;
  exclude?: number;
}) {
  function toggle(idx: number) {
    if (selected.includes(idx)) {
      onChange(selected.filter((d) => d !== idx));
    } else {
      onChange([...selected, idx]);
    }
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAYS.map((day, idx) => {
        const isExcluded = exclude === idx;
        const isSelected = selected.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            disabled={isExcluded}
            onClick={() => toggle(idx)}
            className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
              isExcluded
                ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                : isSelected
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}

// ─── 여러 요일에 아이템 추가 모달 ──────────────────────────────────
function MultiDayAddModal({
  defaultDays,
  onClose,
  onAdded,
}: {
  defaultDays: number[];
  onClose: () => void;
  onAdded: (days: number[]) => void;
}) {
  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultDays);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selectedDays.length === 0) return;
    setSaving(true);

    await fetch("/api/weekly/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), days: selectedDays }),
    });

    setSaving(false);
    onAdded(selectedDays);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800 text-sm">여러 요일에 추가</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">아이템 이름</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 지갑, 이어폰, 충전기..."
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-2">추가할 요일 선택</label>
            <DayCheckboxes selected={selectedDays} onChange={setSelectedDays} />
            {selectedDays.length === 0 && (
              <p className="text-xs text-red-400 mt-1.5">요일을 하나 이상 선택해주세요</p>
            )}
          </div>

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
              disabled={saving || !name.trim() || selectedDays.length === 0}
              className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-40"
            >
              {saving ? "추가 중..." : `${selectedDays.length}개 요일에 추가`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 요일 복사 모달 ────────────────────────────────────────────────
function CopyDayModal({
  fromDay,
  onClose,
  onCopied,
}: {
  fromDay: number;
  onClose: () => void;
  onCopied: (toDays: number[]) => void;
}) {
  const [toDays, setToDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  async function handleCopy() {
    if (toDays.length === 0) return;
    setSaving(true);

    const res = await fetch("/api/weekly/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDay, toDays }),
    });
    const data = await res.json();
    setResult(data.copied);
    setSaving(false);
    onCopied(toDays);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-800 text-sm">
            {DAYS[fromDay]}요일 아이템 복사
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {result !== null ? (
            <div className="text-center py-4">
              <p className="text-stone-700 text-sm font-medium">
                {result}개 아이템이 복사됐습니다
              </p>
              <p className="text-stone-400 text-xs mt-1">이미 있는 아이템은 건너뜁니다</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700"
              >
                확인
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  복사할 대상 요일 선택
                </label>
                <DayCheckboxes selected={toDays} onChange={setToDays} exclude={fromDay} />
                {toDays.length === 0 && (
                  <p className="text-xs text-stone-400 mt-1.5">대상 요일을 선택해주세요</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
                >
                  취소
                </button>
                <button
                  onClick={handleCopy}
                  disabled={saving || toDays.length === 0}
                  className="flex-1 py-2.5 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-40"
                >
                  {saving ? "복사 중..." : `${toDays.length}개 요일로 복사`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 드래그 가능한 아이템 ──────────────────────────────────────────
function SortableItem({
  item,
  onToggle,
  onDelete,
}: {
  item: WeeklyItem;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 group bg-white">
      <button
        {...attributes}
        {...listeners}
        className="text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="4" y="3" width="2" height="2" rx="1" />
          <rect x="10" y="3" width="2" height="2" rx="1" />
          <rect x="4" y="7" width="2" height="2" rx="1" />
          <rect x="10" y="7" width="2" height="2" rx="1" />
          <rect x="4" y="11" width="2" height="2" rx="1" />
          <rect x="10" y="11" width="2" height="2" rx="1" />
        </svg>
      </button>

      <button
        onClick={() => onToggle(item.id, item.isActive)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          item.isActive ? "bg-stone-700 border-stone-700 text-white" : "border-stone-300"
        }`}
      >
        {item.isActive && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span className={`flex-1 text-sm ${item.isActive ? "text-stone-800" : "text-stone-400 line-through"}`}>
        {item.name}
      </span>

      <button
        onClick={() => onDelete(item.id)}
        className="text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
      >
        ×
      </button>
    </li>
  );
}

// ─── 요일 섹션 ────────────────────────────────────────────────────
function DaySection({
  day,
  dayIndex,
  refreshKey,
  onOpenMultiAdd,
  onOpenCopy,
}: {
  day: string;
  dayIndex: number;
  refreshKey: number;
  onOpenMultiAdd: (dayIndex: number) => void;
  onOpenCopy: (dayIndex: number) => void;
}) {
  const [items, setItems] = useState<WeeklyItem[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/weekly?day=${dayIndex}`);
    const data = await res.json();
    setItems(data);
  }, [dayIndex]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, order: idx }));
    setItems(reordered);

    await fetch("/api/weekly/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: reordered.map(({ id, order }) => ({ id, order })) }),
    });
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), dayOfWeek: dayIndex }),
    });
    const item = await res.json();
    setItems((prev) => [...prev, item]);
    setNewName("");
    setAdding(false);
  }

  async function toggleItem(id: string, isActive: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: !isActive } : i)));
    await fetch("/api/weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/weekly", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-stone-700 text-sm">{day}요일</h2>
          <span className="text-xs text-stone-400">{items.length}개</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 복사 버튼 */}
          <button
            onClick={() => onOpenCopy(dayIndex)}
            title="다른 요일로 복사"
            className="text-xs px-2 py-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="5" width="8" height="9" rx="1.5"/>
              <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12H5"/>
            </svg>
            복사
          </button>
          {/* 여러 요일 추가 버튼 */}
          <button
            onClick={() => onOpenMultiAdd(dayIndex)}
            title="여러 요일에 추가"
            className="text-xs px-2 py-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
            </svg>
            다중 추가
          </button>
        </div>
      </div>

      {/* 아이템 목록 */}
      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-stone-50">
              {items.map((item) => (
                <SortableItem key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* 단일 아이템 추가 입력 */}
      <form onSubmit={addItem} className="px-4 py-2 flex gap-2 border-t border-stone-50">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="이 요일에만 추가..."
          className="flex-1 text-sm py-1.5 focus:outline-none text-stone-600 placeholder:text-stone-300"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="text-xs px-3 py-1 bg-stone-100 text-stone-600 rounded-lg disabled:opacity-40 hover:bg-stone-200 transition-colors"
        >
          추가
        </button>
      </form>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function WeeklySettingsClient() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [multiAddDays, setMultiAddDays] = useState<number[] | null>(null);
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleMultiAdded(_days: number[]) {
    setMultiAddDays(null);
    setRefreshKey((k) => k + 1);
  }

  function handleCopied(_toDays: number[]) {
    setRefreshKey((k) => k + 1);
  }

  const visibleDays = selectedDay === null
    ? DAYS.map((_, i) => i)
    : [selectedDay];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-stone-400 hover:text-stone-600">←</Link>
            <h1 className="text-base font-bold text-stone-800">요일별 고정 아이템</h1>
          </div>
          {/* 전체 여러 요일 추가 버튼 */}
          <button
            onClick={() => setMultiAddDays(selectedDay !== null ? [selectedDay] : [])}
            className="text-sm px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span>
            여러 요일에 추가
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-3">
        {/* 요일 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl border border-stone-200 p-1">
          <button
            onClick={() => setSelectedDay(null)}
            className={`flex-1 py-1.5 text-xs rounded-xl font-medium transition-colors ${
              selectedDay === null ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            전체
          </button>
          {DAYS.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx === selectedDay ? null : idx)}
              className={`flex-1 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                selectedDay === idx ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* 요일 섹션 */}
        {visibleDays.map((dayIndex) => (
          <DaySection
            key={dayIndex}
            day={DAYS[dayIndex]}
            dayIndex={dayIndex}
            refreshKey={refreshKey}
            onOpenMultiAdd={(d) => setMultiAddDays([d])}
            onOpenCopy={(d) => setCopyFromDay(d)}
          />
        ))}
      </main>

      {/* 여러 요일에 추가 모달 */}
      {multiAddDays !== null && (
        <MultiDayAddModal
          defaultDays={multiAddDays}
          onClose={() => setMultiAddDays(null)}
          onAdded={handleMultiAdded}
        />
      )}

      {/* 복사 모달 */}
      {copyFromDay !== null && (
        <CopyDayModal
          fromDay={copyFromDay}
          onClose={() => setCopyFromDay(null)}
          onCopied={(days) => { handleCopied(days); setCopyFromDay(null); }}
        />
      )}
    </div>
  );
}
