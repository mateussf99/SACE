"use client"

import { useState, useCallback } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DataItem { ciclo: string; [key: string]: string | number }



interface GraficoProps {
  id: string
  title: string
  label: string
  dataInicial: DataItem[]
  configInicial: Record<string, { label: string; color?: string }>
}

interface IndexProps {
  anoInicial: number
  anosDisponiveis: number[]
  graficos: GraficoProps[]
}

const BASE_PALETTE = ["#002fbdff", "#c96219ff", "#ffcc00ff", "#019e13ff", "#ff0000ff", "#ff00b7ff"]

const CustomLegend = ({ payload }: { payload?: { value: string; color: string }[] }) => (
  <div className="overflow-x-auto w-full mt-2">
    <div className="flex gap-2 flex-nowrap">
      {payload?.map((e, i) => (
        <div
          key={i}
          className="flex items-center gap-1 px-2 py-1 rounded-full min-w-max"
        >
          <span className="h-3 w-4 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-fluid-small font-medium text-gray-500 whitespace-nowrap">
            {e.value}
          </span>
        </div>
      ))}
    </div>
  </div>
)

const sanitizeData = (data: unknown): DataItem[] =>
  Array.isArray(data)
    ? data.map(it => {
        if (typeof it !== "object" || !it) return { ciclo: "N/A" }
        const obj = it as Record<string, unknown>
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [
          k, k === "ciclo" ? String(v ?? "N/A") : +v! || 0,
        ])) as DataItem
      })
    : []

export default function Index({  graficos }: IndexProps) {
  const [graficoIndex, setGraficoIndex] = useState(0)

  const [navLoading, setNavLoading] = useState(false)

  const current = graficos[graficoIndex]

  const getColorForKey = useCallback(
    (key: string) => {
      const idx = Object.keys(current.configInicial).indexOf(key)
      return idx < 0
        ? BASE_PALETTE[0]
        : BASE_PALETTE[idx] ?? `hsl(${((idx - BASE_PALETTE.length) * 360) / 12},70%,50%)`
    },
    [current]
  )

  const handlePrevGrafico = () => !navLoading && setGraficoIndex((prev) => (prev - 1 + graficos.length) % graficos.length)
  const handleNextGrafico = () => !navLoading && setGraficoIndex((prev) => (prev + 1) % graficos.length)

  return (
    <Card className="rounded-2xl shadow-sm p-4 w-full min-w-[350px] border-none">
      <CardHeader className="flex items-center justify-between p-0">
        <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold">{current.title}</CardTitle>
        
        <div className="flex p-1 items-center border rounded-xl text-fluid-small">
          <button onClick={handlePrevGrafico} aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
          <span className="px-2">{current.label}</span>
          <button onClick={handleNextGrafico} aria-label="Próxima"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ChartContainer config={current.configInicial} className="w-full min-h-[250px] font-semibold text-[8px] md:text-[10px] lg:text-xs xl:text-sm 2xl:text-base  ">
          <LineChart data={sanitizeData(current.dataInicial)} margin={{ left: 4, right: 4, top: 12 }}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="ciclo" tickLine={false} axisLine={false} tickMargin={8} tick={{ dx: -8 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: "Quantidade", angle: -90, position: "outsideLeft", style: { textAnchor: "middle", fill: "#45484cff", fontSize: 14, fontWeight: "bold" }, dx: -20 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Legend content={<CustomLegend />} />
            {Object.keys(current.configInicial).map(k => (
              <Line
                key={k}
                dataKey={k}
                type="linear"
                stroke={getColorForKey(k)}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
