import { useState, useCallback } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { ChevronLeft, ChevronRight } from "lucide-react"

type ChartItem = { ciclo: string; notificacoes: number; casos: number }

interface VersionData {
  title: string
  label: string
  data: ChartItem[]
  totalNotificacoes: number
  totalCasos: number
  labelsBarras: { notificacoes: string; casos: string }
  gradientsColors: { notificacoes: [string, string]; casos: [string, string] }
}

type Props = Omit<VersionData, "label"> & { label?: string }

const sanitizeData = (data: unknown): ChartItem[] =>
  Array.isArray(data)
    ? data.map(d => ({
        ciclo: String((d as ChartItem).ciclo ?? "N/A"),
        notificacoes: Number((d as ChartItem).notificacoes) || 0,
        casos: Number((d as ChartItem).casos) || 0,
      }))
    : []

const sanitizeVersion = (payload: unknown): VersionData | null => {
  if (typeof payload !== "object" || !payload) return null
  const obj = payload as Partial<VersionData>
  return {
    title: obj.title ?? "Sem título",
    label: obj.label ?? "Versão desconhecida",
    data: sanitizeData(obj.data),
    totalNotificacoes: obj.totalNotificacoes || 0,
    totalCasos: obj.totalCasos || 0,
    labelsBarras: obj.labelsBarras ?? { notificacoes: "Notificações", casos: "Casos" },
    gradientsColors: obj.gradientsColors ?? { notificacoes: ["#ccc", "#999"], casos: ["#ccc", "#999"] },
  }
}

function Index({ title, data, totalNotificacoes, totalCasos, label = "sem texto", gradientsColors, labelsBarras }: Props) {
  const initialVersion: VersionData = { title, label, data: sanitizeData(data), totalNotificacoes, totalCasos, labelsBarras, gradientsColors }

  const [versionIndex, setVersionIndex] = useState(0)
  const [versionsCache, setVersionsCache] = useState<Record<string, VersionData>>({ "0": initialVersion })
  const [navState, setNavState] = useState({ navLoading: false, noNextVersion: false })

  const currentVersion = versionsCache[versionIndex] || initialVersion

  const loadVersion = useCallback(
    async (i: number) => {
      const key = String(i)
      if (versionsCache[key]) return versionsCache[key]
      setNavState(s => ({ ...s, navLoading: true }))
      try {
        const res = await fetch(`/api/notificacoes-vs-casos/version/${i}`)
        if (!res.ok) return res.status === 404 && setNavState(s => ({ ...s, noNextVersion: true })), null
        const version = sanitizeVersion(await res.json())
        if (version) setVersionsCache(s => ({ ...s, [key]: version }))
        setNavState({ navLoading: false, noNextVersion: false })
        return version
      } catch {
        return null
      } finally {
        setNavState(s => ({ ...s, navLoading: false }))
      }
    },
    [versionsCache]
  )

  const handleNav = (dir: -1 | 1) =>
    !navState.navLoading &&
    (dir === -1 ? versionIndex > 0 : !navState.noNextVersion) &&
    loadVersion(versionIndex + dir).then(v => v && setVersionIndex(versionIndex + dir))

  const chartConfig: ChartConfig = {
    notificacoes: { label: currentVersion.labelsBarras.notificacoes },
    casos: { label: currentVersion.labelsBarras.casos },
  }

  const LegendItem = ({ k, total }: { k: "notificacoes" | "casos"; total: number }) => (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-1">
        <span className="h-3 w-6 rounded-full" style={{ background: `linear-gradient(to left, ${currentVersion.gradientsColors[k][0]}, ${currentVersion.gradientsColors[k][1]})` }} />
        <span className="font-medium text-xs xl:text-base 2xl:text-2xl text-gray-600">{chartConfig[k].label}</span>
      </div>
      <span className="block text-muted-foreground font-bold text-sm md:text-base xl:text-2xl mt-1">{total}</span>
    </div>
  )

  return (
    <Card className="min-w-[300px] h-full p-2 md:p-5 xl:p-10 pt-4 border-none">
      <CardHeader className="p-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xs sm-text-base md:text-lg lg:text-xl xl:text-2xl">{currentVersion.title}</CardTitle>
        <div className="flex items-center text-xs md:text-base xl:text-xl border border-gray-300 text-gray-800 rounded-xl px-2 py-1">
          <button className="px-2 md:px-4 disabled:opacity-50" onClick={() => handleNav(-1)} disabled={versionIndex === 0 || navState.navLoading}>
            <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
          </button>
          <span className="mx-2 sm:mx-4 font-semibold text-[10px] sm-text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">{currentVersion.label}</span>
          <button className="px-2 md:px-4 disabled:opacity-50" onClick={() => handleNav(1)} disabled={navState.noNextVersion || navState.navLoading}>
            <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex items-center justify-center">
        <div className="flex flex-col w-full lg:flex-row md:items-center md:gap-4">
          <ChartContainer config={chartConfig} className="h-full w-full min-w-[70%] font-semibold text-[8px] md:text-[12px] lg:text-sm xl:text-base 2xl:text-xl aspect-[2/1] [@media(min-width:900px)]:aspect-[3/1]">
            <BarChart data={currentVersion.data} margin={{ top: 3, left: 0 }} barCategoryGap="16%">
              <CartesianGrid stroke="#c1c6cfff" />
              <XAxis dataKey="ciclo" axisLine={false} tickMargin={8} />
              <YAxis axisLine={false} tickMargin={8} domain={[0, (max: number) => Math.ceil((max * 1.2) / 5) * 5]} />
              <ChartTooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} content={<ChartTooltipContent />} />
              <defs>
                {(["notificacoes", "casos"] as const).map(k => (
                  <linearGradient key={k} id={`${k}-gradient`} x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor={currentVersion.gradientsColors[k][0]} />
                    <stop offset="100%" stopColor={currentVersion.gradientsColors[k][1]} />
                  </linearGradient>
                ))}
              </defs>
              {Object.keys(chartConfig).map(k => (
                <Bar key={k} dataKey={k} fill={`url(#${k}-gradient)`} radius={[8, 8, 8, 8]} label={{ position: "top", fill: "#222d3f", fontWeight: "bold" }} />
              ))}
            </BarChart>
          </ChartContainer>

          <div className="mt-2 md:mt-0 flex flex-row lg:flex-col justify-center gap-5 md:gap-4">
            <LegendItem k="notificacoes" total={currentVersion.totalNotificacoes} />
            <LegendItem k="casos" total={currentVersion.totalCasos} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default Index