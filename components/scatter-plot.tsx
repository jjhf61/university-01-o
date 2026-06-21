"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { displayScore, getProgramRowId, type Program } from "@/lib/admission-data"

type Props = {
  programs: (Program & { univ?: string })[]
  userGrade: number
  modeLabel: string
  labelField?: "unit" | "univ" | "univUnit"
  title?: string
  description?: string
  onDotClick?: (rowId: string) => void
}

const YEARS = [2025, 2024, 2023] as const

const YEAR_COLORS: Record<number, string> = {
  2023: "oklch(0.58 0.21 25)", // red
  2024: "oklch(0.55 0.18 255)", // blue
  2025: "oklch(0.62 0.15 160)", // green
}

const ZOOM_STEP = 1.35
const DEFAULT_ZOOM = 10
const MIN_ZOOM = DEFAULT_ZOOM * 0.35
const MAX_ZOOM = DEFAULT_ZOOM * 25
const BASE_CHART_WIDTH = 640
const DOT_STACK_STEP = 34
const ROW_VERTICAL_PADDING = 56
const LABEL_OFFSET_PX = 34

type Dot = { score: number; label: string; typeName: string; ratio: number; rowId: string }
type PlacedDot = Dot & { yOffset: number; labelAbove: boolean }

function dotStackOffset(index: number, total: number): number {
  if (total <= 1) return 0
  const mid = (total - 1) / 2
  return Math.round((index - mid) * DOT_STACK_STEP)
}

function layoutStackedDots(dots: Dot[]): PlacedDot[] {
  const groups = new Map<string, Dot[]>()
  for (const dot of dots) {
    const key = dot.score.toFixed(2)
    const group = groups.get(key)
    if (group) group.push(dot)
    else groups.set(key, [dot])
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.label.localeCompare(b.label, "ko"))
  }

  const counters = new Map<string, number>()
  return dots.map((dot) => {
    const key = dot.score.toFixed(2)
    const group = groups.get(key)!
    const index = counters.get(key) ?? 0
    counters.set(key, index + 1)
    const yOffset = dotStackOffset(index, group.length)
    const labelAbove = yOffset < 0
    return { ...dot, yOffset, labelAbove }
  })
}

function buildDotLabel(
  p: Program & { univ?: string },
  labelField: "unit" | "univ" | "univUnit",
): string {
  if (labelField === "univ") return p.univ ?? p.unit
  if (labelField === "univUnit") return [p.univ, p.unit].filter(Boolean).join(" ")
  return p.unit
}

function maxStackSize(dots: Dot[]): number {
  const counts = new Map<string, number>()
  for (const dot of dots) {
    const key = dot.score.toFixed(2)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Math.max(1, ...counts.values())
}

export function ScatterPlot({
  programs,
  userGrade,
  modeLabel,
  labelField = "unit",
  title = "전형별 모집단위 산포도 (3개년 비교)",
  description,
  onDotClick,
}: Props) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollRatioRef = useRef(0)

  const base = useMemo(() => {
    const scores = programs
      .map(displayScore)
      .filter((s): s is number => s != null && Number.isFinite(s))
    const finiteUserGrade = Number.isFinite(userGrade) ? userGrade : null
    const all = finiteUserGrade != null ? [...scores, finiteUserGrade] : scores

    let lo: number
    let hi: number
    if (all.length === 0) {
      lo = 1
      hi = 9
    } else {
      lo = Math.floor(Math.min(...all) * 10) / 10
      hi = Math.ceil(Math.max(...all) * 10) / 10
    }

    const pad = 0.3
    const domainMin = Math.max(0, lo - pad)
    const domainMax = Math.max(domainMin + 0.1, hi + pad)
    const domainSpan = Math.max(domainMax - domainMin, 0.2)

    const perYear: Record<number, PlacedDot[]> = { 2023: [], 2024: [], 2025: [] }
    for (const p of programs) {
      const s = displayScore(p)
      if (s == null || !Number.isFinite(s)) continue
      perYear[p.year].push({
        score: s,
        label: buildDotLabel(p, labelField),
        typeName: p.type,
        ratio: p.ratio,
        rowId: getProgramRowId(p),
      })
    }
    for (const y of YEARS) {
      perYear[y].sort(
        (a, b) =>
          a.score - b.score ||
          a.label.localeCompare(b.label, "ko") ||
          a.typeName.localeCompare(b.typeName, "ko"),
      )
      perYear[y] = layoutStackedDots(perYear[y])
    }

    const maxStack = Math.max(...YEARS.map((y) => maxStackSize(perYear[y])), 1)
    const rowMinHeight = Math.max(
      168,
      ROW_VERTICAL_PADDING * 2 + maxStack * DOT_STACK_STEP + LABEL_OFFSET_PX * 2,
    )

    const tickCount = 7
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
      Number((domainMin + (domainSpan * i) / tickCount).toFixed(2)),
    )

    return {
      domainMin,
      domainMax,
      domainSpan,
      ticks,
      perYear,
      rowMinHeight,
      hasUserGrade: finiteUserGrade != null,
    }
  }, [programs, userGrade, labelField])

  const contentWidth = Math.round(BASE_CHART_WIDTH * zoom)

  const posPx = (value: number) => {
    if (!Number.isFinite(value)) return 0
    return ((value - base.domainMin) / base.domainSpan) * contentWidth
  }

  useEffect(() => {
    setZoom(DEFAULT_ZOOM)
    scrollRatioRef.current = 0
  }, [programs, labelField])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
      if (maxScroll === 0) {
        el.scrollLeft = 0
        scrollRatioRef.current = 0
        return
      }
      el.scrollLeft = scrollRatioRef.current * maxScroll
    })
  }, [zoom, contentWidth, base.domainMin, base.domainMax])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    scrollRatioRef.current = maxScroll > 0 ? el.scrollLeft / maxScroll : 0
  }

  const changeZoom = (next: number) => {
    const el = scrollRef.current
    if (el) {
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
      scrollRatioRef.current = maxScroll > 0 ? el.scrollLeft / maxScroll : 0
    }
    setZoom(next)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground text-balance">{title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              aria-label="축소"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => changeZoom(Math.max(MIN_ZOOM, zoom / ZOOM_STEP))}
            >
              <Minus className="size-3.5" />
              <span className="text-xs">축소</span>
            </Button>
            <span className="min-w-12 px-1 text-center font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round((zoom / DEFAULT_ZOOM) * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              aria-label="확대"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => changeZoom(Math.min(MAX_ZOOM, zoom * ZOOM_STEP))}
            >
              <Plus className="size-3.5" />
              <span className="text-xs">확대</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="줌 초기화"
              disabled={zoom === DEFAULT_ZOOM}
              onClick={() => {
                scrollRatioRef.current = 0
                setZoom(DEFAULT_ZOOM)
              }}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {YEARS.map((y) => (
              <span key={y} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: YEAR_COLORS[y] }}
                />
                <span className="text-muted-foreground">{y}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-0 border-l border-dashed border-muted-foreground/70" />
              <span className="text-muted-foreground">사용자 등급</span>
            </span>
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        {description ??
          `표시 기준: 70%컷(없으면 50%컷) · 점수가 낮을수록(왼쪽) 우수합니다. 사용자 등급(${modeLabel})은 회색 점선으로 표시됩니다.`}
      </p>

      <div className="flex">
        <div className="w-12 shrink-0">
          <div className="mb-1 h-5" />
          {YEARS.map((y) => (
            <div
              key={y}
              className="flex items-center justify-center border-t border-border/60 text-sm font-bold tabular-nums"
              style={{ minHeight: `${base.rowMinHeight}px`, color: YEAR_COLORS[y] }}
            >
              {y}
            </div>
          ))}
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
        >
          <div className="relative" style={{ width: `${contentWidth}px` }}>
            <div className="relative mb-1 h-5">
              {base.ticks.map((t, i) => (
                <span
                  key={`tick-${i}`}
                  className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground tabular-nums"
                  style={{ left: `${posPx(t)}px` }}
                >
                  {t.toFixed(2)}
                </span>
              ))}
            </div>

            <div className="relative">
              {base.hasUserGrade &&
                userGrade >= base.domainMin &&
                userGrade <= base.domainMax && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-20 w-0 -translate-x-1/2 border-l border-dashed border-muted-foreground/70"
                    style={{ left: `${posPx(userGrade)}px` }}
                  >
                    <span className="absolute -top-1 left-1 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background tabular-nums">
                      {userGrade.toFixed(2)}
                    </span>
                  </div>
                )}

              {YEARS.map((y) => {
                const dots = base.perYear[y]
                return (
                  <div
                    key={y}
                    className="relative border-t border-border/60"
                    style={{ minHeight: `${base.rowMinHeight}px` }}
                  >
                    <div className="absolute inset-0">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-border/70"
                        aria-hidden
                      />
                      {dots.map((d) => (
                          <span
                            key={d.rowId}
                            role="button"
                            tabIndex={0}
                            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:z-30"
                            style={{
                              left: `${posPx(d.score)}px`,
                              top: `calc(50% + ${d.yOffset}px)`,
                            }}
                            onClick={() => onDotClick?.(d.rowId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                onDotClick?.(d.rowId)
                              }
                            }}
                          >
                            <span className="pointer-events-none absolute left-1/2 bottom-full z-40 mb-1 hidden w-max max-w-[9.5rem] -translate-x-1/2 rounded border border-border bg-popover px-2.5 py-1.5 text-center text-[9px] leading-snug text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
                              <span className="font-medium">{d.label}</span>
                              {d.typeName ? (
                                <>
                                  <span className="mx-1 text-muted-foreground/60">·</span>
                                  <span className="text-muted-foreground">{d.typeName}</span>
                                </>
                              ) : null}
                              <span className="mx-1 text-muted-foreground/60">·</span>
                              <span className="font-mono tabular-nums text-muted-foreground">
                                {d.score.toFixed(2)}
                              </span>
                              <span className="mx-1 text-muted-foreground/60">·</span>
                              <span className="text-muted-foreground">경쟁률 {d.ratio}</span>
                            </span>
                            <span
                              className="block size-1.5 rounded-full ring-1 ring-card transition-transform group-hover:scale-150 group-focus-visible:scale-150"
                              style={{ backgroundColor: YEAR_COLORS[y] }}
                            />
                            <span
                              className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-card/55 px-1.5 py-0.5 text-[9px] leading-snug text-foreground shadow-sm"
                              style={
                                d.labelAbove
                                  ? { bottom: `${LABEL_OFFSET_PX}px` }
                                  : { top: `${LABEL_OFFSET_PX}px` }
                              }
                            >
                              <span className="block text-center">{d.label}</span>
                              {d.typeName ? (
                                <span className="block text-center text-[8px] text-muted-foreground">
                                  {d.typeName}
                                </span>
                              ) : null}
                              <span className="block text-center font-mono text-muted-foreground tabular-nums">
                                {d.score.toFixed(2)}
                              </span>
                            </span>
                          </span>
                      ))}
                      {dots.length === 0 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          데이터 없음
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        ※ 표시값은 70%컷 우선, 없으면 50%컷을 사용합니다. 모든 점에 모집단위·표시점수가 표시됩니다.
        확대 후 가로 스크롤로 구간을 이동할 수 있으며, 점을 클릭하면 아래 표의 해당 행으로 이동합니다.
      </p>
    </div>
  )
}
