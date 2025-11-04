"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import ImoveisTrabalhadosChart from "@/components/GraficosPizza/GraficoPizzaGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // Import do contexto
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Lista de cores disponíveis
const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#F43F5E"]

export default function GraficoDepositosTratados() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod() // Valores automáticos do contexto

  const [dados, setDados] = useState<{ name: string; value: number; color?: string }[]>([])
  const [centerNumbers, setCenterNumbers] = useState<{ worked?: number; total: number; centerText?: string }>({ total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return // Evita chamada se não tiver valores ainda

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data } = await api.get(`/grafico/depositos_tratados/${anoSelecionado}/${cicloSelecionado}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        // Gera dinamicamente o array de chartData
        const entries = Object.entries(data).filter(([_, value]) => Number(value) > 0)
        let chartData = entries.map(([key, value], index) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1), // capitaliza o nome
          value: Number(value),
          color: COLORS[index % COLORS.length], // aplica cor em ordem
        }))

        // Mantém exatamente a mesma lógica que você já tinha
        chartData = chartData.sort((a, b) => b.value - a.value)

        const total = chartData.reduce((sum, item) => sum + item.value, 0)

        setDados(chartData)
        setCenterNumbers({
          total,
          centerText: "Total",
        })
      } catch (error) {
        console.error("Erro ao carregar dados do gráfico de depósitos tratados:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [anoSelecionado, cicloSelecionado])

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
    <ImoveisTrabalhadosChart
      title="Depósitos Tratados"
      data={dados}
      centerNumbers={centerNumbers}
    />
  )
}
