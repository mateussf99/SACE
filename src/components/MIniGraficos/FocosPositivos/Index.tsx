"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import CardMetrica from "@/components/MIniGraficos/Generico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DadosGrafico = {
  ano: number
  ciclo: number
  focos_positivos: number
}

type FocosPositivosResponse = {
  dados_grafico: DadosGrafico[]
  resumo_ciclo_atual: {
    focos_positivos: number
    dados_do_ultimo_ciclo: number
    porcentagem: string
    crescimento: "aumentou" | "diminuiu" | "estável" | string
  }
}

export default function GraficoFocosPositivos() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod() // valores automáticos do contexto
  const [dados, setDados] = useState<FocosPositivosResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return // evita chamada se não tiver valores

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data } = await api.get<FocosPositivosResponse>(
          `/grafico/focos_positivos/${anoSelecionado}/${cicloSelecionado}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        console.log("Dados retornados do endpoint focos positivos:", data)
        setDados(data)
      } catch (error) {
        console.error("Erro ao carregar dados do gráfico de focos positivos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [anoSelecionado, cicloSelecionado])

      if (loading) {
  return (
    <Card className="rounded-2xl shadow-none overflow-auto min-w-[240px] h-full p-3 mb:p-5 border-none flex flex-col animate-pulse">
      <CardHeader className="flex items-center justify-between p-0">
        <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold bg-gray-200 rounded w-1/3 h-4" /> <span>Carregando...</span>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="w-full flex-1 bg-gray-100 rounded min-h-[250px]" />
      </CardContent>
    </Card>
  )
}
  if (!dados) return <p>Nenhum dado disponível.</p>

  // 🔹 Mantemos todos os ciclos retornados pelo endpoint
const todosCiclos = [...dados.dados_grafico].slice(-5)

  console.log("Todos os ciclos (na ordem original):", todosCiclos)

  // 🔹 Prepara a lista de valores para o gráfico
  const chartData = todosCiclos.map(d => ({ value: d.focos_positivos }))
  console.log("Lista de valores para o gráfico (chartData):", chartData)

  // 🔹 Total do ciclo selecionado (destacado no gráfico)
  const currentTotal = todosCiclos.find(d => d.ano === anoSelecionado && d.ciclo === cicloSelecionado)?.focos_positivos ?? 0
  console.log("Ciclo selecionado:", cicloSelecionado, "currentTotal:", currentTotal)

  return (
    <CardMetrica
      title="Focos Positivos"
      data={chartData} // envia todos os ciclos para o gráfico
      currentTotal={currentTotal} // valor do ciclo selecionado
      previousTotal={dados.resumo_ciclo_atual.dados_do_ultimo_ciclo} // valor do último ciclo
      increaseColor="#315dd3ff"
      decreaseColor="#f7ca04ff"
      showPercentage={false}
    />
  )
}
