import { useState, useCallback } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DataItem { ciclo: string; [key: string]: string | number }
interface VersionData {
  title: string; label: string; anos: number[]; ano: number; data: DataItem[];
  config: Record<string, { label: string; color?: string }>
}

const BASE_PALETTE = ["#002fbdff", "#c96219ff", "#ffcc00ff", "#019e13ff", "#ff0000ff", "#ff00b7ff"]

const CustomLegend = ({ payload }: { payload?: { value: string; color: string }[] }) => (
  <div className="flex flex-wrap gap-2 mt-2 justify-center items-center">
    {payload?.map((e, i) => (
      <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-full">
        <span className="h-3 w-6 rounded-full" style={{ backgroundColor: e.color }} />
        <span className="text-xs xl:text-base 2xl:text-2xl font-medium text-gray-500">{e.value}</span>
      </div>
    ))}
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

const sanitizeVersion = (p: unknown, ano: number): VersionData | null =>
  p && typeof p === "object"
    ? (() => {
        const obj = p as Record<string, unknown>;
        return {
          title: String(obj.title ?? "Sem título"),
          label: String(obj.label ?? "Versão desconhecida"),
          anos: Array.isArray(obj.anos) ? (obj.anos as number[]) : [ano],
          ano: typeof obj.ano === "number" ? (obj.ano as number) : ano,
          data: sanitizeData(obj.data),
          config: (typeof obj.config === "object" && obj.config) ? (obj.config as VersionData["config"]) : {},
        };
      })()
    : null

 function Index({
  title, anoInicial, anosDisponiveis, label, dataInicial, configInicial,
}: {
  title: string; anoInicial: number; anosDisponiveis: number[]; label: string;
  dataInicial: DataItem[]; configInicial: VersionData["config"]
}) {
  const [selectedAno, setSelectedAno] = useState(anoInicial)
  const [versionIndex, setVersionIndex] = useState(0)
  const [navLoading, setNavLoading] = useState(false)
  const [noNextVersion, setNoNextVersion] = useState(false)
  const [versionsCache, setVersionsCache] = useState<Record<string, VersionData>>({
    [`0:${anoInicial}`]: { title, label, anos: anosDisponiveis, ano: anoInicial, data: sanitizeData(dataInicial), config: configInicial },
  })

  const current = versionsCache[`${versionIndex}:${selectedAno}`] || Object.values(versionsCache)[0]

  const getColorForKey = useCallback(
    (key: string) => {
      const idx = Object.keys(current.config).indexOf(key)
      return idx < 0 ? BASE_PALETTE[0] : BASE_PALETTE[idx] ?? `hsl(${((idx - BASE_PALETTE.length) * 360) / 12},70%,50%)`
    },
    [current.config]
  )

  const loadVersion = useCallback(async (i: number, ano = selectedAno) => {
    const k = `${i}:${ano}`
    if (versionsCache[k]) return setSelectedAno(versionsCache[k].ano), versionsCache[k]
    setNavLoading(true)
    try {
      const res = await fetch(`/api/casos-por-ciclos/version/${i}?ano=${ano}`)
      if (!res.ok) return res.status === 404 && setNoNextVersion(true), null
      const v = sanitizeVersion(await res.json(), ano)
      if (!v) return null
      setVersionsCache(p => ({ ...p, [k]: v })); setSelectedAno(v.ano); setNoNextVersion(false); return v
    } catch { return null } finally { setNavLoading(false) }
  }, [selectedAno, versionsCache])

  const handlePrev = () => versionIndex > 0 && !navLoading && loadVersion(versionIndex - 1).then(v => v && setVersionIndex(versionIndex - 1))
  const handleNext = () => !navLoading && !noNextVersion && loadVersion(versionIndex + 1).then(v => v ? setVersionIndex(versionIndex + 1) : setNoNextVersion(true))

  return (
    <Card className="rounded-2xl shadow-sm p-2 sm:p-4 lg:pt-8 lg:pb-8 min-w-[350px] border-none">
      <CardHeader className="flex items-center justify-between p-0">
        <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-2xl font-semibold">{current.title}</CardTitle>
        <select value={selectedAno} onChange={e => loadVersion(versionIndex, +e.target.value)}
          className="rounded-lg border p-2 text-xs sm:text-sm xl:text-xl 2xl:text-2xl" disabled={navLoading}>
          {current.anos.map(a => <option key={a}>{a}</option>)}
        </select>
        <div className="flex p-1 items-center border rounded-xl text-[10px] sm:text-sm md:text-base xl:text-xl 2xl:text-2xl">
          <button onClick={handlePrev} disabled={versionIndex === 0 || navLoading} aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
          <span className="px-2">{current.label}</span>
          <button onClick={handleNext} disabled={noNextVersion || navLoading} aria-label="Próxima"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ChartContainer config={current.config} className="w-full min-h-[250px] font-semibold text-[8px] md:text-[10px] lg:text-xs xl:text-sm 2xl:text-base [@media(min-width:900px)]:aspect-[3/1]">
          <LineChart data={current.data} margin={{ left: 12, right: 12, top: 12 }}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="ciclo" tickLine={false} axisLine={false} tickMargin={8} tick={{ dx: -8 }} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} label={{ value: "Quantidade", angle: -90, position: "outsideLeft", style: { textAnchor: "middle", fill: "#45484cff", fontSize: 14, fontWeight: "bold" }, dx: -30 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Legend content={<CustomLegend />} />
            {Object.keys(current.config).map(k => <Line key={k} dataKey={k} type="linear" stroke={getColorForKey(k)} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />)}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
export default Index