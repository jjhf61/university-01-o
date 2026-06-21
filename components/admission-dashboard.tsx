"use client"

import { useEffect, useMemo, useState } from "react"
import {
  convertFromG5,
  getAvailableTracksForUnitCategory,
  getAvailableTracksForUniversity,
  getProgramsByUnitCategory,
  getUnitCategoryLabel,
  getUniversities,
  getUniversityData,
  initializeData,
  type UnitCategory,
} from "@/lib/admission-data"
import { GradeInput, type ViewMode } from "@/components/grade-input"
import { ResultCards } from "@/components/result-cards"
import { ScatterPlot } from "@/components/scatter-plot"
import { DataTable } from "@/components/data-table"

type GradeMode = "integrated" | "busan" | "daejin"

const GRADE_MODES: { key: GradeMode; label: string }[] = [
  { key: "integrated", label: "50:50 통합" },
  { key: "busan", label: "부산 9등급" },
  { key: "daejin", label: "대진대 9등급" },
]

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "university", label: "대학별 보기" },
  { key: "unit", label: "모집단위별 보기" },
]

const DEFAULT_UNIVERSITY = "연세대"
const DEFAULT_TRACK = "종합"

export function AdmissionDashboard() {
  const [grade5, setGrade5] = useState(1.2)
  const [viewMode, setViewMode] = useState<ViewMode>("university")
  const [university, setUniversity] = useState(DEFAULT_UNIVERSITY)
  const [unitCategory, setUnitCategory] = useState<UnitCategory>("medical")
  const [universities, setUniversities] = useState<string[]>([])
  const [track, setTrack] = useState(DEFAULT_TRACK)
  const [gradeMode, setGradeMode] = useState<GradeMode>("integrated")
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeData()
      .then(() => {
        const list = getUniversities()
        setUniversities(list)
        setUniversity((prev) => {
          if (prev && list.includes(prev)) return prev
          if (list.includes(DEFAULT_UNIVERSITY)) return DEFAULT_UNIVERSITY
          return list[0] ?? ""
        })
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.")
        setLoading(false)
      })
  }, [])

  const { busan, daejin, integrated } = useMemo(
    () => convertFromG5(grade5),
    [grade5, loading],
  )

  const universityPrograms = useMemo(
    () => (university ? getUniversityData(university) : []),
    [university, loading],
  )

  const availableTracks = useMemo(() => {
    if (viewMode === "university") {
      return university ? getAvailableTracksForUniversity(university) : []
    }
    return unitCategory ? getAvailableTracksForUnitCategory(unitCategory) : []
  }, [viewMode, university, unitCategory, loading])

  useEffect(() => {
    setTrack((prev) => {
      if (prev && availableTracks.includes(prev)) return prev
      if (availableTracks.includes(DEFAULT_TRACK)) return DEFAULT_TRACK
      return availableTracks[0] ?? ""
    })
  }, [viewMode, university, unitCategory, availableTracks])

  const activeTrack =
    track && availableTracks.includes(track)
      ? track
      : availableTracks.includes(DEFAULT_TRACK)
        ? DEFAULT_TRACK
        : (availableTracks[0] ?? "")

  const universityFilteredPrograms = useMemo(() => {
    if (!activeTrack) return universityPrograms
    return universityPrograms.filter((p) => p.track === activeTrack)
  }, [universityPrograms, activeTrack])

  const unitDetailPrograms = useMemo(() => {
    if (!activeTrack) return []
    return getProgramsByUnitCategory(unitCategory, activeTrack)
  }, [unitCategory, activeTrack, loading])

  const unitCategoryLabel = getUnitCategoryLabel(unitCategory)

  const scatterPrograms =
    viewMode === "university" ? universityFilteredPrograms : unitDetailPrograms

  const tablePrograms =
    viewMode === "university" ? universityFilteredPrograms : unitDetailPrograms

  useEffect(() => {
    setHighlightedRowId(null)
  }, [viewMode, university, unitCategory, activeTrack])

  const handleDotClick = (rowId: string) => {
    setHighlightedRowId(rowId)
    requestAnimationFrame(() => {
      document.getElementById(rowId)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  const userGrade =
    gradeMode === "busan" ? busan : gradeMode === "daejin" ? daejin : integrated
  const gradeModeLabel = GRADE_MODES.find((m) => m.key === gradeMode)!.label

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-sm text-muted-foreground">입결 데이터를 불러오는 중…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance sm:text-3xl">
          클로이 아빠의 고교 내신 등급 변환기
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Copyright@All Teachers</p>
        <div className="mt-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">
            50:50 통합 등급 = (부산 9등급 + 대진대 9등급) / 2
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            데이터 출처: 어디가 3개년 입결 · 부산광역시교육청 등급 분석 자료 · 대진대학교 연구자료
          </p>
        </div>
      </header>

      <section className="mb-5">
        <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setViewMode(m.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === m.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={viewMode === m.key}
            >
              {m.label}
            </button>
          ))}
        </div>

        <GradeInput
          viewMode={viewMode}
          grade5={grade5}
          setGrade5={setGrade5}
          university={university}
          setUniversity={setUniversity}
          universities={universities}
          unitCategory={unitCategory}
          setUnitCategory={setUnitCategory}
          track={activeTrack}
          setTrack={setTrack}
          availableTracks={[...availableTracks]}
        />
      </section>

      <section className="mb-5">
        <ResultCards busan={busan} daejin={daejin} integrated={integrated} />
      </section>

      <section className="mb-6">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {GRADE_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setGradeMode(m.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                gradeMode === m.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={gradeMode === m.key}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <ScatterPlot
          programs={scatterPrograms}
          userGrade={userGrade}
          modeLabel={gradeModeLabel}
          labelField={viewMode === "unit" ? "univUnit" : "unit"}
          title={
            viewMode === "unit"
              ? `${unitCategoryLabel} 지원 가능 대학 산포도 (3개년 비교)`
              : "전형별 모집단위 산포도 (3개년 비교)"
          }
          description={
            viewMode === "unit"
              ? `표시 기준: 70%컷(없으면 50%컷) · 대학·모집단위별 입결 · 점수가 낮을수록(왼쪽) 우수 · 사용자 등급(${gradeModeLabel})은 회색 점선`
              : undefined
          }
          onDotClick={handleDotClick}
        />
      </section>

      <section>
        <DataTable
          programs={tablePrograms}
          viewMode={viewMode}
          track={activeTrack}
          university={university}
          unit={unitCategoryLabel}
          highlightedRowId={highlightedRowId}
        />
      </section>
    </main>
  )
}
