"use client"

import { useEffect, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { UNIT_CATEGORIES, type UnitCategory } from "@/lib/admission-data"

export type ViewMode = "university" | "unit"

type Props = {
  viewMode: ViewMode
  grade5: number
  setGrade5: (v: number) => void
  university: string
  setUniversity: (v: string) => void
  universities: string[]
  unitCategory: UnitCategory
  setUnitCategory: (v: UnitCategory) => void
  track: string
  setTrack: (v: string) => void
  availableTracks: string[]
}

function formatGrade(n: number) {
  if (!Number.isFinite(n)) return "1.2"
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

function clampGrade(n: number) {
  return Math.min(5, Math.max(1, Math.round(n * 100) / 100))
}

export function GradeInput({
  viewMode,
  grade5,
  setGrade5,
  university,
  setUniversity,
  universities,
  unitCategory,
  setUnitCategory,
  track,
  setTrack,
  availableTracks,
}: Props) {
  const safeGrade5 = Number.isFinite(grade5) ? grade5 : 1.2
  const [inputText, setInputText] = useState(() => formatGrade(safeGrade5))
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setInputText(formatGrade(safeGrade5))
    }
  }, [safeGrade5, isEditing])

  const commitInput = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === "") {
      setInputText(formatGrade(safeGrade5))
      return
    }

    const n = Number(trimmed)
    if (Number.isFinite(n)) {
      const clamped = clampGrade(n)
      setGrade5(clamped)
      setInputText(formatGrade(clamped))
      return
    }

    setInputText(formatGrade(safeGrade5))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <label className="mb-3 block text-sm font-semibold text-foreground" htmlFor="grade-slider">
          5등급 평균 입력
        </label>
        <div className="flex items-center gap-4">
          <Slider
            id="grade-slider"
            value={safeGrade5}
            min={1}
            max={5}
            step={0.01}
            onValueChange={(value) => {
              const n = Array.isArray(value) ? value[0] : value
              if (typeof n === "number" && Number.isFinite(n)) {
                setGrade5(clampGrade(n))
              }
            }}
            className="flex-1"
            aria-label="5등급 평균"
          />
          <input
            type="text"
            inputMode="decimal"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
              setIsEditing(false)
              commitInput(inputText)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              }
            }}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-center font-mono text-base tabular-nums"
            aria-label="5등급 평균 직접 입력"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {viewMode === "university" ? (
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <label className="mb-3 block text-sm font-semibold text-foreground" htmlFor="university">
              대학 선택
            </label>
            <select
              id="university"
              value={university || universities[0] || ""}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {universities.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <label className="mb-3 block text-sm font-semibold text-foreground" htmlFor="unit">
              모집단위 선택
            </label>
            <select
              id="unit"
              value={unitCategory}
              onChange={(e) => setUnitCategory(e.target.value as UnitCategory)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {UNIT_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <label className="mb-3 block text-sm font-semibold text-foreground" htmlFor="track">
            중심전형
          </label>
          <select
            id="track"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            disabled={availableTracks.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {availableTracks.length === 0 ? (
              <option value="">데이터 없음</option>
            ) : (
              availableTracks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  )
}
