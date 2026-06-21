type Props = {
  busan: number
  daejin: number
  integrated: number
}

const cards = [
  {
    key: "busan",
    label: "부산 9등급",
    bg: "bg-busan",
    fg: "text-busan-foreground",
  },
  {
    key: "daejin",
    label: "대진대 9등급",
    bg: "bg-daejin",
    fg: "text-daejin-foreground",
  },
  {
    key: "integrated",
    label: "50:50 통합",
    bg: "bg-integrated",
    fg: "text-integrated-foreground",
  },
] as const

export function ResultCards({ busan, daejin, integrated }: Props) {
  const values: Record<string, number> = { busan, daejin, integrated }
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "-")
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`flex flex-col justify-center rounded-xl px-5 py-4 shadow-sm ${c.bg} ${c.fg}`}
        >
          <span className="text-sm font-medium opacity-90">{c.label}</span>
          <span className="font-mono text-3xl font-bold tabular-nums">
            {fmt(values[c.key])}
          </span>
        </div>
      ))}
    </div>
  )
}
