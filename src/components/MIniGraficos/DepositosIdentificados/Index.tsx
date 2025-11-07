"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import CardMetrica from "@/components/MIniGraficos/Generico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DadosGrafico = {
  ano: number
  ciclo: number
  depositos_identificados: number
}

type DepositosIdentificadosResponse = {
  dados_grafico: DadosGrafico[]
  resumo_ciclo_atual: {
    depositos_identificados: number
    dados_do_ultimo_ciclo: number
    porcentagem: string
    crescimento: "aumentou" | "diminuiu" | string
  }
}

export default function GraficoDepositosIdentificados() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod() // valores automáticos do contexto
  const [dados, setDados] = useState<DepositosIdentificadosResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return // evita chamada se não tiver valores

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data } = await api.get<DepositosIdentificadosResponse>(
          `/grafico/depositos_identificados/${anoSelecionado}/${cicloSelecionado}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        console.log("Dados retornados do endpoint depósitos identificados:", data)
        setDados(data)
      } catch (error) {
        console.error("Erro ao carregar dados do gráfico de depósitos identificados:", error)
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
        <div className="w-full flex-1 bg-gray-100 rounded min-h-[180px]" />
      </CardContent>
    </Card>
  )
}
 if (!dados || !dados.dados_grafico?.length) {
    return (
      <CardMetrica
        title="Casos Confirmados"
        subtitle="Nenhum dado disponível para este ciclo"
        data={[]}              // força estado 'Sem histórico'
        currentTotal={0}
        previousTotal={0}
        increaseColor="#9ca3af" // neutro
        decreaseColor="#9ca3af" // neutro
      />
    )
  }


const todosCiclos = [...dados.dados_grafico].slice(-5)


  const chartData = todosCiclos.map(d => ({ value: d.depositos_identificados }))


  const currentTotal = todosCiclos.find(d => d.ano === anoSelecionado && d.ciclo === cicloSelecionado)?.depositos_identificados ?? 0

  return (
    <CardMetrica
      title="Depósitos Identificados"
      data={chartData} 
      currentTotal={currentTotal}
      previousTotal={dados.resumo_ciclo_atual.dados_do_ultimo_ciclo}
      increaseColor="#d59100ff"
      decreaseColor="#0469c7ff"
      showPercentage={false}
    />
  )
}
