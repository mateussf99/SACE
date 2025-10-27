"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto

export default function GraficoAtividadesImovel() {
  const { year: ano, cycle: cicloSelecionado } = usePeriod() // valores automáticos do contexto
  const [dados, setDados] = useState<{ name: string; value: number }[]>([])
  const [totalImoveis, setTotalImoveis] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ano || !cicloSelecionado) return // evita chamada se não tiver valores

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data } = await api.get<Record<string, number>>(
          `/grafico/atividades_realizadas/${ano}/${cicloSelecionado}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        // Total é a soma de todos os valores retornados
        const total = Object.values(data).reduce((acc, val) => acc + val, 0)
        setTotalImoveis(total)

        // Converte o objeto para array do gráfico
        const dataChart = Object.entries(data)
          .filter(([_, value]) => value > 0)
          .map(([tipo, value]) => ({
            name: tipo.toUpperCase(),
            value,
          }))

        setDados(dataChart)
      } catch (error) {
        console.error("Erro ao carregar dados do gráfico:", error)
        setDados([])
        setTotalImoveis(0)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [ano, cicloSelecionado])

  if (loading) return <p>Carregando gráfico...</p>
  if (dados.length === 0) return <p>Nenhum dado disponível.</p>

  return (
    <GraficoBarrasSimples
      data={dados}
      total={totalImoveis}
      title="Imóveis trabalhados"

    />
  )
}
