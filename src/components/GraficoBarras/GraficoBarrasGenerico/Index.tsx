"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

type DataItem = { name: string; value: number }

type GraficoBarrasSimples = {
  data: DataItem[]
  total?: number
  title: string
  subtitle?: string
  isPercentage?: boolean
  barColors?: string[]
}

function Index({
  data = [],
  total,
  title = "Sem título",
  subtitle,
  isPercentage = false,
  barColors,
}: GraficoBarrasSimples) {
  const safeTitle = title?.toString().trim() || "Sem título"
  const safeTotal = typeof total === "number" && !isNaN(total) ? total : undefined

  const safeData = data
    .filter(d => d?.value && !isNaN(d.value))
    .map(d => ({
      name: d.name?.toString() || "Sem nome",
      value: isPercentage ? Math.min(d.value, 100) : d.value,
    }))

  // ✅ Detecta estado vazio
  const isEmpty = !safeData.length || safeData.every((item) => (item.value ?? 0) === 0)

  const maxValue = Math.max(...safeData.map(d => d.value), 0)
  const yMax = isPercentage ? 100 : Math.max(5, Math.ceil(maxValue * 1.1 / 5) * 5)

  const formatPercentageValue = (val: number | string) => `${Math.round(Number(val) || 0)}%`

  const getBarColor = (index: number) => {
    if (Array.isArray(barColors)) {
      return barColors[index % barColors.length]
    }
    return "url(#colorBlue)"
  }

  const chartConfig = { value: { label: "", color: "url(#colorBlue)" } } satisfies ChartConfig

  function formatNumber(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)} mil`
    return value.toString()
  }

  function calculateYAxisWidthDynamic(data: number[], pxPerChar = 6) {
    const maxValue = Math.max(...data)
    const formattedValues = data.map(formatNumber)
    const maxLength = Math.max(...formattedValues.map(v => v.length))
    let extraPadding = 12
    if (maxValue >= 1_000_000) extraPadding = 15
    else if (maxValue >= 1_000) extraPadding = 5
    return maxLength * pxPerChar + extraPadding
  }

  const numberOfBars = safeData.length
  const barCategoryGapDynamic =
    numberOfBars <= 4 ? "30%" : numberOfBars <= 8 ? "15%" : "10%"

  return (
    <Card className="min-w-[300px] h-full p-2 sm:p-5 border border-none shadow-none ">
      <CardHeader className="p-0 flex justify-between items-center">
        <div>
          <CardTitle className="text-sm md:text-lg xl:text-xl font-semibold">
            {safeTitle}
          </CardTitle>
          {subtitle && (
            <CardDescription className="text-fluid-small text-gray-800">
              {subtitle}
            </CardDescription>
          )}
        </div>
        {safeTotal !== undefined && (
          <span className="font-bold text-fluid-large">
            Total: <span className="text-blue-600">{safeTotal}</span>
          </span>
        )}
      </CardHeader>

      <CardContent className="p-0 ">
        <ChartContainer
          config={chartConfig}
          className="text-[8px] md:text-[12px] aspect-[4/3]"
        >
          {isEmpty ? (
            <BarChart
              data={[
                { name: "A", placeholder: 40 },
                { name: "B", placeholder: 60 },
                { name: "C", placeholder: 30 },
                { name: "D", placeholder: 50 },
              ]}
              margin={{ top: 15, left: 2 }}
              barCategoryGap="20%"
            >
              <CartesianGrid stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#636871ff" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Bar
                dataKey="placeholder"
                fill="#d1d5db"
                radius={[6, 6, 0, 0]}
                opacity={0.5}
              />
            </BarChart>
          ) : (
            <BarChart
              accessibilityLayer
              data={safeData}
              margin={{ top: 15, left: 2 , right: 2}}
              barCategoryGap={barCategoryGapDynamic}
            >
              <defs>
                {!isPercentage && (
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e40af" />
                    <stop offset="100%" stopColor="#213A77" />
                  </linearGradient>
                )}
              </defs>

              <CartesianGrid stroke="#b6cdf889" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#374151" }}
                axisLine={false}
                tickLine
              />
              <YAxis
                domain={[0, yMax]}
                tick={{ fill: "#222d3f" }}
                axisLine={false}
                tickLine
                width={calculateYAxisWidthDynamic(safeData.map(d => d.value))}
                tickFormatter={isPercentage ? formatPercentageValue : formatNumber}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar
                dataKey="value"
                radius={[8, 8, 8, 8]}
                label={{
                  position: "top",
                  fill: "#222d3f",
                  fontWeight: "bold",
                  formatter: isPercentage ? formatPercentageValue : undefined,
                }}
              >
                {safeData.map((_, index) => (
                  <Cell key={index} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartContainer>

        {isEmpty && (
          <div className="text-center px-4 mt-2">
            <p className="text-xs md:text-sm text-muted-foreground">
              Ainda não há dados para o ciclo selecionado.
            </p>
            <p className="mt-1 text-[10px] md:text-xs text-muted-foreground/80">
              Assim que novos registros forem adicionados, o gráfico será exibido aqui.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default Index
