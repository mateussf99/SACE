"use client"

import { useEffect, useState, useCallback } from "react"
import Index from "@/components/graficoMultiplo/generico/Index"
import { api } from "@/services/api"
import { usePeriod } from "@/contexts/PeriodContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Dataset {
  label: string
  data: (number | null)[]
}

interface ApiResponse {
  labels: string[]
  datasets: Dataset[]
}

interface DataItem {
  ciclo: string
  [key: string]: string | number
}

interface GraficoProps {
  id: string
  title: string
  label: string
  dataInicial: DataItem[]
  configInicial: Record<string, { label: string; color?: string }>
}
export default function GraficoCiclosUnificado() {
  const { year: anoSelecionado } = usePeriod()
  const [loading, setLoading] = useState(true)
  const [graficos, setGraficos] = useState<GraficoProps[]>([])
  const ano = anoSelecionado ?? new Date().getFullYear()

  const fetchGrafico = useCallback(async (endpoint: string) => {
    const { data } = await api.get<ApiResponse>(endpoint)
    const config: Record<string, { label: string }> = {}
    data.datasets.forEach(d => (config[d.label] = { label: d.label }))

    const dataPorCiclo: DataItem[] = data.labels.map((ciclo, i) => {
      const obj: DataItem = { ciclo }
      data.datasets.forEach(d => {
        obj[d.label] = d.data[i] ?? 0
      })
      return obj
    })

    return { dataPorCiclo, config }
  }, [])

  useEffect(() => {
    if (!anoSelecionado) return

    async function fetchAll() {
      setLoading(true)
      try {
        const [casos, acoes, depositos] = await Promise.all([
          fetchGrafico(`/grafico/casos_por_ciclo/${anoSelecionado}`),
          fetchGrafico(`/grafico/acoes_bloqueio/${anoSelecionado}`),
          fetchGrafico(`/grafico/depositos_por_ciclo/${anoSelecionado}`)
        ])

        setGraficos([
          {
            id: "casos",
            title: "Casos por Ciclo",
            label: "Doenças",
            dataInicial: casos.dataPorCiclo,
            configInicial: casos.config,
          },
          {
            id: "acoes",
            title: "Ações de Bloqueio",
            label: "Ações de bloqueio",
            dataInicial: acoes.dataPorCiclo,
            configInicial: acoes.config,
          },
          {
            id: "depositos",
            title: "Depósitos por Ciclo",
            label: "Depósitos positivos",
            dataInicial: depositos.dataPorCiclo,
            configInicial: depositos.config,
          },
        ])
      } catch (err) {
        console.error("Erro ao carregar gráficos:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [anoSelecionado, fetchGrafico])


 if (loading) {
  return (
    <Card className="rounded-2xl shadow-none p-4 w-full min-w-[350px] h-full border-none flex flex-col animate-pulse">
      <CardHeader className="flex items-center justify-between p-0">
        <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold bg-gray-200 rounded w-1/3 h-4" /> <span>Carregando...</span>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="w-full flex-1 bg-gray-100 rounded min-h-[250px]" />
      </CardContent>
    </Card>
  )
}


  return (
    <Index
      anoInicial={ano}
      anosDisponiveis={[ano]}
      graficos={graficos}
    />
  )
}