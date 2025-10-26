"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // Import do contexto

type DadosReincidencia = Record<string, number>

export default function GraficoTaxaReincidencia() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod()
  const [dados, setDados] = useState<{ name: string; value: number }[]>([])
  const [totalReincidentes, setTotalReincidentes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""

        const { data } = await api.get<DadosReincidencia>(
          `/grafico/taxa_de_reincidencia/${anoSelecionado}/${cicloSelecionado}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        // Converte o objeto retornado em um array compatível com o gráfico
        const dataChart = Object.entries(data).map(([bairro, valor]) => ({
          name: bairro,
          value: valor,
        }))

        // Soma total de imóveis reincidentes
        const total = dataChart.reduce((acc, curr) => acc + curr.value, 0)

        setDados(dataChart)
        setTotalReincidentes(total)
      } catch (error) {
        console.error("Erro ao carregar taxa de reincidência:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [anoSelecionado, cicloSelecionado])

  if (loading) return <p>Carregando gráfico...</p>
  if (dados.length === 0) return <p>Nenhum dado disponível.</p>

  // 🔹 Paleta de cores (pode ajustar conforme quiser)
  const cores = [
    "#e5e903ff", // azul
    "#ffa200ff", // amarelo
    "#ff0000ff", // vermelho
  
  ]

  return (
    <GraficoBarrasSimples
      data={dados}
      total={totalReincidentes}
      title="Imoveis Reincidência"
      subtitle={`Imóveis reincidentes por bairro `}
      barColors={cores}
    />
  )
}
