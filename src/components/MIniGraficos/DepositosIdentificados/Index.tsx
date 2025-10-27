"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import CardMetrica from "@/components/MIniGraficos/Generico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto

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

  if (loading) return <p>Carregando gráfico...</p>
  if (!dados) return <p>Nenhum dado disponível.</p>

  // 🔹 Mantemos todos os ciclos retornados pelo endpoint
  const todosCiclos = [...dados.dados_grafico]

  console.log("Todos os ciclos (na ordem original):", todosCiclos)

  // 🔹 Prepara a lista de valores para o gráfico
  const chartData = todosCiclos.map(d => ({ value: d.depositos_identificados }))
  console.log("Lista de valores para o gráfico (chartData):", chartData)

  // 🔹 Total do ciclo selecionado (destacado no gráfico)
  const currentTotal = todosCiclos.find(d => d.ano === anoSelecionado && d.ciclo === cicloSelecionado)?.depositos_identificados ?? 0
  console.log("Ciclo selecionado:", cicloSelecionado, "currentTotal:", currentTotal)

  return (
    <CardMetrica
      title="Depósitos Identificados"
      data={chartData} // envia todos os ciclos para o gráfico
      currentTotal={currentTotal} // valor do ciclo selecionado
      previousTotal={dados.resumo_ciclo_atual.dados_do_ultimo_ciclo} // valor do último ciclo
      increaseColor="#fa9726ff"
      decreaseColor="#fa9726ff"
      showPercentage={false}
    />
  )
}
