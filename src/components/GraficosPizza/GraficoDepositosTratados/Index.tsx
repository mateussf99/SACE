"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import ImoveisTrabalhadosChart from "@/components/GraficosPizza/GraficoPizzaGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // Import do contexto

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

  if (loading) return <p>Carregando gráfico...</p>
  if (dados.length === 0) return <p>Nenhum dado disponível.</p>

  return (
    <ImoveisTrabalhadosChart
      title="Depósitos Tratados"
      data={dados}
      centerNumbers={centerNumbers}
    />
  )
}
