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
  /** opcional: sinaliza erro ao carregar do backend */
  loadError?: boolean
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
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [
            k,
            k === "ciclo" ? String(v ?? "N/A") : +v! || 0,
          ])
        ) as DataItem
      })
    : []

export default function Index({ graficos, loadError }: IndexProps) {
  const [graficoIndex, setGraficoIndex] = useState(0)
  const [navLoading] = useState(false) // remova o setNavLoading se não usa

  const hasGraphs = graficos.length > 0

  // 🔒 Garante índice válido mesmo se a lista de gráficos mudar
  const safeIndex = hasGraphs ? Math.min(graficoIndex, graficos.length - 1) : 0

  const current: GraficoProps = hasGraphs
    ? graficos[safeIndex]
    : {
        id: "placeholder",
        title: "Gráfico indisponível",
        label: "",
        dataInicial: [],
        configInicial: {},
      }

  const chartData = hasGraphs ? sanitizeData(current.dataInicial) : []

  const seriesKeys = Object.keys(current.configInicial)

  // ✅ Gráfico existe, mas dados estão vazios/zerados
  const isEmptyData =
    hasGraphs &&
    (
      !chartData.length ||
      chartData.every(row =>
        seriesKeys.every(k => Number(row[k] ?? 0) === 0)
      )
    )

  // ✅ Quando devemos mostrar o skeleton?
  const showSkeleton = !hasGraphs || isEmptyData || !!loadError

  const getColorForKey = useCallback(
    (key: string) => {
      const idx = Object.keys(current.configInicial).indexOf(key)
      return idx < 0
        ? BASE_PALETTE[0]
        : BASE_PALETTE[idx] ??
            `hsl(${((idx - BASE_PALETTE.length) * 360) / 12},70%,50%)`
    },
    [current]
  )

  const handlePrevGrafico = () =>
    !navLoading &&
    setGraficoIndex(prev => (prev - 1 + graficos.length) % graficos.length)

  const handleNextGrafico = () =>
    !navLoading && setGraficoIndex(prev => (prev + 1) % graficos.length)

  // 🔎 Mensagem dinâmica abaixo do gráfico, de acordo com o cenário
  let emptyTitle: string | null = null
  let emptySubtitle: string | null = null

if (loadError || !hasGraphs) {
  emptyTitle = "Erro ao carregar os dados."
  emptySubtitle = "Tente novamente mais tarde ou verifique a conexão com o servidor."
} else if (isEmptyData) {
  emptyTitle = "Ainda não há dados para o período selecionado."
  emptySubtitle = "Assim que novos registros forem adicionados, o gráfico será exibido aqui."
}

  return (
    <Card className="rounded-2xl shadow-none p-4 w-full min-w-[350px] h-full border-none flex flex-col">
      <CardHeader className="flex items-center justify-between p-0">
        <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold">
          {current.title}
        </CardTitle>

        {hasGraphs && (
          <div className="flex p-1 items-center border rounded-xl text-fluid-small">
            <button onClick={handlePrevGrafico} aria-label="Anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-2">{current.label}</span>
            <button onClick={handleNextGrafico} aria-label="Próxima">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        <ChartContainer
          config={current.configInicial}
          className="w-full h-full flex-1 min-h-[250px] font-semibold text-[8px] md:text-[10px] lg:text-xs xl:text-sm 2xl:text-base"
        >
          {showSkeleton ? (
            // ✅ SKELETON – sempre que não houver dados, gráficos ou houver erro
            <LineChart
              data={[
                { ciclo: "1", valor: 2, valor2: 5 },
                { ciclo: "2", valor: 3.5, valor2: 3.8 },
                { ciclo: "3", valor: 4.2, valor2: 2.5 },
                { ciclo: "4", valor: 3, valor2: 4 },
              ]}
              margin={{ left: 4, right: 4, top: 12 }}
            >
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis
                dataKey="ciclo"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ dx: -8, fill: "#9ca3af" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "#9ca3af" }}
              />
              {/* Linha 1 do skeleton */}
              <Line
                type="linear"
                dataKey="valor"
                stroke="#d1d5db"
                strokeWidth={2}
                dot={{ r: 3, stroke: "#d1d5db", fill: "#e5e7eb" }}
                isAnimationActive={false}
              />
              {/* Linha 2 do skeleton */}
              <Line
                type="linear"
                dataKey="valor2"
                stroke="#e5e7eb"
                strokeWidth={2}
                dot={{ r: 3, stroke: "#e5e7eb", fill: "#f3f4f6" }}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            // ✅ GRÁFICO REAL
            <LineChart data={chartData} margin={{ left: 4, right: 4, top: 12 }}>
              <CartesianGrid stroke="#e5e7eb" />
              <XAxis
                dataKey="ciclo"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ dx: -8 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                label={{
                  value: "Quantidade",
                  angle: -90,
                  position: "outsideLeft",
                  style: {
                    textAnchor: "middle",
                    fill: "#45484cff",
                    fontSize: 14,
                    fontWeight: "bold",
                  },
                  dx: -20,
                }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Legend content={<CustomLegend />} />
              {seriesKeys.map(k => (
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
          )}
        </ChartContainer>

        {showSkeleton && emptyTitle && (
          <div className="text-center px-4 mt-2">
            <p className="text-xs md:text-sm text-muted-foreground">
              {emptyTitle}
            </p>
            {emptySubtitle && (
              <p className="mt-1 text-[10px] md:text-xs text-muted-foreground/80">
                {emptySubtitle}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
