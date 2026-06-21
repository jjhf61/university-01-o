export type Program = {
  year: 2023 | 2024 | 2025
  track: string // 중심전형
  type: string // 전형명
  unit: string // 모집단위
  capacity: number // 모집인원
  ratio: number // 경쟁률
  fillRank: number // 충원순위
  cut50: number | null // 50%cut
  cut70: number | null // 70%cut
}

export type ProgramWithUniv = Program & { univ: string }

export const TRACK_OPTIONS = ["종합", "교과"] as const

export type UnitCategory = "medical" | "ee"

export const UNIT_CATEGORIES: { key: UnitCategory; label: string }[] = [
  { key: "medical", label: "의예/약학" },
  { key: "ee", label: "전기/전자/통신/반도체" },
]

function matchesUnitCategory(unit: string, category: UnitCategory): boolean {
  if (category === "medical") return unit.includes("의예") || unit.includes("약학")
  return ["전기", "전자", "통신", "반도체"].some((keyword) => unit.includes(keyword))
}

export function getUnitCategoryLabel(category: UnitCategory): string {
  return UNIT_CATEGORIES.find((c) => c.key === category)?.label ?? category
}

type StoredProgram = Program & { univ: string }

type ConvertRow = {
  g5: number
  busan: number
  daejin: number
  mix: number
}

type RawRow = Record<string, unknown>

function pickFirst(obj: RawRow, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== "") return v
  }
  return undefined
}

function toNum(x: unknown): number {
  const n = Number(x)
  return Number.isFinite(n) ? n : NaN
}

function toOptionalNum(x: unknown): number | null {
  const n = toNum(x)
  return Number.isFinite(n) ? n : null
}

function toCount(x: unknown): number {
  if (x === 0 || x === "0") return 0
  const n = toNum(x)
  return Number.isFinite(n) ? n : 0
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function normalizeRow(raw: RawRow, year: 2023 | 2024 | 2025): StoredProgram {
  const univ = String(
    pickFirst(raw, ["univ", "대학", "대학명", "학교", "학교명"]) ?? "",
  )
  const track = String(
    pickFirst(raw, [
      "mainType",
      "중심전형",
      "중심 전형",
      "전형구분",
      "전형구분(중심)",
      "전형(중심)",
      "전형구분(대분류)",
    ]) ?? "기타",
  )
  const type = String(
    pickFirst(raw, ["type", "전형명", "전형", "세부전형", "세부 전형", "전형(세부)"]) ??
      "-",
  )
  const unit = String(
    pickFirst(raw, ["major", "모집단위", "학과", "모집단위명", "모집단위(학과)"]) ?? "-",
  )

  return {
    year,
    univ,
    track,
    type,
    unit,
    capacity: toCount(pickFirst(raw, ["capacity", "모집인원", "인원", "선발인원", "모집 인원"])),
    ratio: toCount(
      pickFirst(raw, ["competition", "경쟁률", "경쟁 률", "경쟁율"]),
    ),
    fillRank: toCount(
      pickFirst(raw, [
        "extraRank",
        "충원순위",
        "충원",
        "충원 순위",
        "추가합격순위",
        "충원합격순위",
      ]),
    ),
    cut50: toOptionalNum(
      pickFirst(raw, ["cut50", "50%cut", "50%컷", "50컷", "50% 컷", "50%"]),
    ),
    cut70: toOptionalNum(
      pickFirst(raw, ["cut70", "70%cut", "70%컷", "70컷", "70% 컷", "70%"]),
    ),
  }
}

// 표시점수: 70%컷 우선, 없으면 50%컷
export function displayScore(p: Program): number | null {
  if (p.cut70 != null && p.cut70 > 0) return p.cut70
  if (p.cut50 != null && p.cut50 > 0) return p.cut50
  return null
}

export function getProgramRowId(p: Program & { univ?: string }): string {
  return [p.year, p.track, p.type, p.univ ?? "", p.unit].join("|")
}

let admissionCache: StoredProgram[] | null = null
let convertCache: ConvertRow[] | null = null
let universitiesCache: string[] | null = null

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

async function loadJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE_PATH}${url}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`${url} 로드 실패 (${res.status})`)
  return res.json() as Promise<T>
}

export async function loadAdmissionData(): Promise<void> {
  if (admissionCache) return

  const years: (2023 | 2024 | 2025)[] = [2023, 2024, 2025]
  const all: StoredProgram[] = []

  for (const year of years) {
    const raw = await loadJSON<RawRow[]>(`/data/admission_${year}.json`)
    for (const row of raw) {
      all.push(normalizeRow(row, year))
    }
  }

  admissionCache = all
  universitiesCache = [...new Set(all.map((r) => r.univ).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "ko"),
  )
}

export async function loadConvertData(): Promise<void> {
  if (convertCache) return
  convertCache = await loadJSON<ConvertRow[]>("/data/convert.json")
}

export async function initializeData(): Promise<void> {
  await Promise.all([loadAdmissionData(), loadConvertData()])
}

export function getUniversities(): string[] {
  return universitiesCache ?? []
}

export function getUniversityData(name: string): Program[] {
  if (!admissionCache) return []
  return admissionCache
    .filter((r) => r.univ === name)
    .map(({ univ: _univ, ...rest }) => rest)
}

export function getProgramsByUnitCategory(
  category: UnitCategory,
  track: string,
): ProgramWithUniv[] {
  if (!admissionCache || !track) return []
  return admissionCache
    .filter((r) => r.track === track && matchesUnitCategory(r.unit, category))
    .map(({ univ, ...rest }) => ({ ...rest, univ }))
}

export function getAvailableTracksForUnitCategory(category: UnitCategory): string[] {
  if (!admissionCache) return []
  const trackSet = new Set(
    admissionCache
      .filter((r) => matchesUnitCategory(r.unit, category))
      .map((r) => r.track),
  )
  return TRACK_OPTIONS.filter((t) => trackSet.has(t))
}

export function getAvailableTracksForUniversity(university: string): string[] {
  const trackSet = new Set(getUniversityData(university).map((p) => p.track))
  return TRACK_OPTIONS.filter((t) => trackSet.has(t))
}

/** 산포도용: 연도·대학별 대표 입결(가장 낮은 표시점수) 1건 */
export function aggregateScatterByUniversity(programs: ProgramWithUniv[]): ProgramWithUniv[] {
  const map = new Map<string, ProgramWithUniv>()

  for (const program of programs) {
    const score = displayScore(program)
    if (score == null) continue

    const key = `${program.year}:${program.univ}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, program)
      continue
    }

    const existingScore = displayScore(existing)
    if (existingScore == null || score < existingScore) {
      map.set(key, program)
    }
  }

  return [...map.values()]
}

export function convertFromG5(grade5: number): {
  busan: number
  daejin: number
  integrated: number
} {
  if (!convertCache?.length) {
    return { busan: NaN, daejin: NaN, integrated: NaN }
  }

  const x = clamp(toNum(grade5), 1, 5)
  const rows = [...convertCache].sort((a, b) => a.g5 - b.g5)

  let lo = rows[0]
  let hi = rows[rows.length - 1]
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]
    const b = rows[i + 1]
    if (x >= a.g5 && x <= b.g5) {
      lo = a
      hi = b
      break
    }
  }

  const t = hi.g5 === lo.g5 ? 0 : (x - lo.g5) / (hi.g5 - lo.g5)
  const lerp = (p: number, q: number) => p + (q - p) * t

  return {
    busan: lerp(lo.busan, hi.busan),
    daejin: lerp(lo.daejin, hi.daejin),
    integrated: lerp(lo.mix, hi.mix),
  }
}
