"use client"
import { TrendingUp, TrendingDown, MoveRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { useMemo } from "react"

type DataPoint = { value: number }

type CardMetrica = {
  data?: DataPoint[]
  currentTotal?: number
  previousTotal?: number
  title: string
  subtitle?: string
  increaseColor?: string
  decreaseColor?: string
  bgColor?: string
  showPercentage?: boolean
}

const safeNumber = (
  value: unknown,
  { allowNegative = false, defaultValue = 0 }: { allowNegative?: boolean; defaultValue?: number } = {}
) => {
  const num = Number(typeof value === "string" ? value.replace(",", ".") : value)
  return !isFinite(num) || isNaN(num) || (!allowNegative && num < 0) ? defaultValue : num
}

const safeString = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback

const lightenColor = (hex: string, opacity = 0.1) => {
  if (!hex) return `rgba(0,0,0,${opacity})`
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${opacity})`
}

export default function Index({
  data = [],
  currentTotal = 0,
  previousTotal = 0,
  title,
  subtitle,
  increaseColor = "#22c55e",
  decreaseColor = "#ef4444",
  bgColor,
  showPercentage = false,
}: CardMetrica) {
  const safeCurrent = safeNumber(currentTotal)
  const safePrevious = safeNumber(previousTotal)
  const safeTitle = safeString(title, "Sem título")
  const safeSubtitle = safeString(subtitle)

  const safeData = useMemo(
    () => data.map(d => ({ value: safeNumber(d.value) })),
    [data]
  )

  const hasGraphData =
    safeData.length > 0 && safeData.some(point => point.value !== 0)

  const hasComparisonBase = safePrevious > 0

  const rawPercentChange = hasComparisonBase
    ? ((safeCurrent - safePrevious) / safePrevious) * 100
    : 0

  const isIncrease = hasComparisonBase && safeCurrent > safePrevious
  const isDecrease = hasComparisonBase && safeCurrent < safePrevious
  const isSame = hasComparisonBase && safeCurrent === safePrevious

  const hasTrendInfo = hasGraphData && hasComparisonBase

  let mainColor: string
  if (!hasTrendInfo || isSame) {
    mainColor = bgColor ? "#ffffff" : "#6b7280" // gray-500
  } else if (isIncrease) {
    mainColor = increaseColor
  } else {
    mainColor = decreaseColor
  }

  const badgeColor = lightenColor(mainColor, hasTrendInfo ? 0.2 : 0.15)

  // 🏷️ Conteúdo da badge
 let badgeLabel: string | null = null
  let TrendIcon: typeof TrendingUp | typeof TrendingDown | typeof MoveRight | null = null

  if (!hasTrendInfo) {
    badgeLabel = "Sem histórico"
  } else if (isSame) {
    // mesmo valor: 0% de variação + ícone neutro
    badgeLabel = `${Math.abs(rawPercentChange).toFixed(1)}%`
    TrendIcon = MoveRight
  } else {
    // aumento ou redução
    badgeLabel = `${Math.abs(rawPercentChange).toFixed(1)}%`
    TrendIcon = isIncrease ? TrendingUp : TrendingDown
  }

  const formatValue = (value: number) =>
    showPercentage
      ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
      : value.toLocaleString("pt-BR")

  return (
    <Card
      className={`overflow-auto min-w-[240px] h-full p-3 mb:p-5 border-none ${
        bgColor ? "text-white" : ""
      }`}
      style={{
        background: bgColor
          ? `linear-gradient(to right, ${lightenColor(bgColor, 0.8)} 20%, ${bgColor} 100%)`
          : undefined,
      }}
    >
      <CardHeader className="flex justify-between p-2 h-auto">
        <div className="flex flex-col flex-1 space-y-2">
          <CardTitle className="text-fluid-large font-medium">
            {safeSubtitle
              ? safeTitle
              : safeTitle.split(" ").map((word, idx) => (
                  <span key={idx} className="block">
                    {word}
                  </span>
                ))}
          </CardTitle>

          {safeSubtitle && (
            <span className="text-xs sm:text-sm mb:text-base text-muted-foreground">
              {safeSubtitle}
            </span>
          )}

          <div className="flex items-center gap-2 pt-3">
            <span className="text-5xl max-[400px]:text-2xl font-bold">
              {formatValue(safeCurrent)}
            </span>

            {!showPercentage && (
              <span
                className="px-1.5 py-0.5 rounded-full text-sm md:text-xs max-[400px]:text-[8px] font-semibold flex items-center gap-0.5"
                style={{ backgroundColor: badgeColor, color: bgColor ? "white" : mainColor }}
              >
                {badgeLabel && <span>{badgeLabel}</span>}
                {TrendIcon && (
                  <TrendIcon
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                    aria-label={isIncrease ? "Aumento" : isDecrease ? "Redução" : "Estável"}
                  />
                )}
              </span>
            )}
          </div>
        </div>

        <div className="w-14 h-8 sm:w-20 md:w-18 md:h-10 xl:w-26 xl:h-14">
          <ResponsiveContainer width="100%" height="100%">
            {hasGraphData ? (
              <LineChart data={safeData}>
                <Line
                  type="linear"
                  dataKey="value"
                  stroke={bgColor ? "white" : mainColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : (
              <LineChart
                data={[
                  { value: 2 },
                  { value: 3.2 },
                  { value: 2.8 },
                  { value: 3.6 },
                ]}
              >
                <Line
                  type="linear"
                  dataKey="value"
                  stroke={bgColor ? "rgba(255,255,255,0.6)" : "#e5e7eb"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex justify-between text-[10px] sm:text-xs md:text-sm lg:text-base">
          <span className="text-muted-foreground">Dados do último ciclo:</span>
          <span className="font-medium" style={{ color: bgColor ? "white" : mainColor }}>
            {formatValue(safePrevious)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
