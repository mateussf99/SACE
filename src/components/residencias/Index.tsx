"use client"
import { PieChart, Pie, Cell, Label, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

export type DataItem = { name: string; value: number; color?: string }
type CenterNumbers = { worked?: number; total: number; centerText?: string }

type ImoveisTrabalhadosChartProps = {
  title: string
  data: DataItem[]
  config?: ChartConfig
  centerNumbers: CenterNumbers
}

function Index({
  title,
  data = [],
  config = {},
  centerNumbers,
}: ImoveisTrabalhadosChartProps) {
  const total = Number.isFinite(centerNumbers.total) && centerNumbers.total >= 0 ? centerNumbers.total : 0
  const worked = Number.isFinite(centerNumbers.worked) && centerNumbers.worked! >= 0 ? centerNumbers.worked : undefined
  const centerText = centerNumbers.centerText?.toString().trim() || undefined
  const hasWorked = worked !== undefined

  const safeData = data
    .filter(d => d && typeof d.name === "string" && Number.isFinite(d.value))
    .map(d => ({ ...d, value: Math.max(0, d.value) })) 

  const chartData = [
    ...safeData.filter(d => d.color),
    ...(hasWorked ? [{
      name: "Não trabalhados",
      value: Math.max(total - (worked ?? 0), 0),
      color: "#DEE6F7"
    }] : []),
  ]

  const [withColor, withoutColor] = [
    safeData.filter(d => d.color),
    safeData.filter(d => !d.color),
  ]

  const Legend = ({ items }: { items: DataItem[] }) => (
    <div className="flex flex-col text-xs sm:text-sm lg:text-base xl:text-md 2xl:text-2xl">
      {items.map(item => (
        <div key={item.name} className="whitespace-nowrap">
          <span className="flex items-center gap-1">
            {item.color && (
              <span
                className="inline-block w-4 h-2 mb:w-6 mb:h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-gray-700 truncate">{item.name}</span>
          </span>
          <span className="font-bold text-gray-900 text-base md:text-lg xl:text-2xl">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )

  const CenterLabel = ({ cx, cy }: { cx: number; cy: number }) => {
    const m = cx * 0.2, s = cx * 0.14
    return (
      <g>
        <circle cx={cx} cy={cy} r={m * 2.8} fill="white" stroke="#e5e7eb" strokeWidth={2} opacity={0.8} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
          {centerText && (
            <tspan x={cx} dy={-m * 0.8} fontSize={s} className="fill-gray-900">
              {centerText}
            </tspan>
          )}
          {hasWorked ? (
            <tspan x={cx} dy={m * 1.2} fontSize={m} fontWeight="bold" className="fill-gray-900">
              {worked}
              <tspan fontSize={s} className="fill-gray-500" dx={4}>/ {total}</tspan>
            </tspan>
          ) : (
            <tspan x={cx} dy={m} fontSize={m} fontWeight="bold" className="fill-gray-900">
              {total}
            </tspan>
          )}
        </text>
      </g>
    )
  }

  return (
    <Card className="min-w-[300px] w-full h-full pl-2 pr-1 sm:p-5 border-none">
      <CardHeader className="text-sm sm:text-base md:text-lg xl:text-2xl font-medium p-0">
        <CardTitle>{title || "Sem título"}</CardTitle>
      </CardHeader>

      <CardContent className="w-full h-full p-0">
        <div className="flex items-center justify-between gap-2 flex-col sm:flex-row h-full">
          <ChartContainer config={config} className="flex-1 max-w-full aspect-square min-w-[150px] sm:flex-[0_1_60%]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" cx="50%" cy="50%" startAngle={270} endAngle={-90} innerRadius="65%" outerRadius="90%">
                  {chartData.map(entry => (
                    <Cell key={entry.name} fill={entry.color!} />
                  ))}
                  <Label content={({ viewBox }) =>
                    viewBox && "cx" in viewBox && "cy" in viewBox
                      ? <CenterLabel cx={viewBox.cx!} cy={viewBox.cy!} />
                      : null
                  } />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <div className="hidden sm:block"><Legend items={safeData} /></div>

          <div className="flex flex-col gap-2 w-full sm:hidden">
            {withoutColor.length > 0 && (
              <div className="flex justify-center w-full">
                <div className="text-center"><Legend items={withoutColor} /></div>
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 justify-items-center px-2 w-full max-w-xs mx-auto">
              {withColor.map(item => <Legend key={item.name} items={[item]} />)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default Index
