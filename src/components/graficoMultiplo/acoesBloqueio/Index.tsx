"use client"

import { useEffect, useState, useCallback } from "react"
import Index from "@/components/graficoMultiplo/generico/Index"
import { api } from "@/services/api"
import { usePeriod } from "@/contexts/PeriodContext"

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
          { id: "casos", title: "Casos por Ciclo", label: "Doenças", dataInicial: casos.dataPorCiclo, configInicial: casos.config },
          { id: "acoes", title: "Ações de Bloqueio", label: "Ações de bloqueio", dataInicial: acoes.dataPorCiclo, configInicial: acoes.config },
          { id: "depositos", title: "Depósitos por Ciclo", label: "Depósitos positivos", dataInicial: depositos.dataPorCiclo, configInicial: depositos.config }
        ])
      } catch (err) {
        console.error("Erro ao carregar gráficos:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [anoSelecionado, fetchGrafico])

  if (loading) return <p>Carregando gráficos...</p>
  if (graficos.length === 0) return <p>Nenhum dado disponível.</p>

  return (
    <Index
      anoInicial={anoSelecionado ?? 2025}
      anosDisponiveis={[anoSelecionado ?? 2025]}
      graficos={graficos}
    />
  )
}
