"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DadosReincidencia = Record<string, number>

export default function GraficoTaxaReincidencia() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod()
  const [dados, setDados] = useState<{ name: string; value: number }[]>([])
  const [barColors, setBarColors] = useState<string[] | undefined>(undefined)
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

        // transforma em array ordenado (mantém a ordem do Object.entries)
        const dataChart = Object.entries(data).map(([bairro, valor]) => ({
          name: bairro,
          value: valor,
        }))

        // Soma total
        const total = dataChart.reduce((acc, curr) => acc + curr.value, 0)
        setTotalReincidentes(total)

        // Se não há dados, limpa e sai
        if (dataChart.length === 0) {
          setDados([])
          setBarColors(undefined)
          return
        }

        // Calcula min/max e range
        const values = dataChart.map(v => v.value)
        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = max - min

        // Função que decide a cor por valor (percentual entre min e max)
        function getColor(value: number) {
          // cores do seu exemplo
          const AMARELO = "#e5e903"
          const LARANJA = "#ffa200"
          const VERMELHO = "#ff0000"

          if (range === 0) {
            // todos iguais -> cor neutra/amarela
            return AMARELO
          }

          const t = (value - min) / range // normalizado 0..1

          if (t > 0.66) return VERMELHO   // top 33%
          if (t > 0.33) return LARANJA   // mid 33%
          return AMARELO                 // low 33%
        }

        // Cria array de cores na mesma ordem do dataChart
        const colors = dataChart.map(item => getColor(item.value))

        // Popula estado (dados sem `fill`, pois o genérico usa barColors)
        setDados(dataChart)
        setBarColors(colors)
      } catch (error) {
        console.error("Erro ao carregar taxa de reincidência:", error)
        setDados([])
        setBarColors(undefined)
        setTotalReincidentes(0)
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
          <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold bg-gray-200 rounded w-1/3 h-4" /> 
          <span>Carregando...</span>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="w-full flex-1 bg-gray-100 rounded min-h-[250px]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <GraficoBarrasSimples
      data={dados}
      total={totalReincidentes}
      title="Imóveis Reincidência"
      subtitle={`Imóveis reincidentes por bairro`}
      barColors={barColors}
    />
  )
}
