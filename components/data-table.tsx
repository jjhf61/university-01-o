"use client"

import { displayScore, getProgramRowId, type Program, type ProgramWithUniv } from "@/lib/admission-data"
import type { ViewMode } from "@/components/grade-input"

type Props = {
  programs: (Program | ProgramWithUniv)[]
  viewMode: ViewMode
  track?: string
  university?: string
  unit?: string
  highlightedRowId?: string | null
}

const fmt = (n: number | null) => (n == null ? "-" : n.toString())

export function DataTable({
  programs,
  viewMode,
  track,
  university,
  unit,
  highlightedRowId,
}: Props) {
  const rows = [...programs].sort((a, b) => b.year - a.year)

  const headers =
    viewMode === "unit"
      ? ["연도", "중심전형", "전형명", "대학", "모집단위", "모집인원", "경쟁률", "충원순위", "50%cut", "70%cut", "표시값(70→50)"]
      : ["연도", "중심전형", "전형명", "모집단위", "모집인원", "경쟁률", "충원순위", "50%cut", "70%cut", "표시값(70→50)"]

  const subtitle =
    viewMode === "unit"
      ? `모집단위: ${unit ?? "-"}${track ? ` · 중심전형: ${track}` : ""}`
      : `선택 대학: ${university ?? "-"}${track ? ` · 중심전형: ${track}` : ""}`

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="mb-1 text-lg font-bold text-foreground">
        {viewMode === "unit" ? "대학별 상세 데이터" : "모집단위 상세 데이터"}
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        {subtitle}. 표는 가로로 스크롤됩니다.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const ds = displayScore(p)
              const univ = "univ" in p ? p.univ : undefined
              const rowId = getProgramRowId(p)
              const isHighlighted = highlightedRowId === rowId
              return (
                <tr
                  key={rowId}
                  id={rowId}
                  className={`scroll-mt-24 border-t border-border odd:bg-background even:bg-muted/30 hover:bg-accent ${
                    isHighlighted ? "bg-primary/15 ring-2 ring-inset ring-primary" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{p.year}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.track}</td>
                  <td className="whitespace-nowrap px-3 py-2">{p.type}</td>
                  {viewMode === "unit" && (
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{univ ?? "-"}</td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{p.unit}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{p.capacity}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{p.ratio}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{p.fillRank}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{fmt(p.cut50)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{fmt(p.cut70)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-bold tabular-nums text-primary">
                    {fmt(ds)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
