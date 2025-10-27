"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import CardMetrica from "@/components/MIniGraficos/Generico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto

type DadosGrafico = {
  ano: number
  casos_confirmados: number
  ciclo: number
}

type CasosConfirmadosResponse = {
  dados_grafico: DadosGrafico[]
  resumo_ciclo_atual: {
    casos_confirmados: number
    dados_do_ultimo_ciclo: number
    porcentagem: string
    crescimento: "aumentou" | "diminuiu" | string
  }
}

export default function GraficoCasosConfirmados() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod() // valores automáticos do contexto
  const [dados, setDados] = useState<CasosConfirmadosResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return // evita chamada se não tiver valores

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data } = await api.get<CasosConfirmadosResponse>(
          `/grafico/casos_confirmados/${anoSelecionado}/${cicloSelecionado}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        setDados(data)
      } catch (error) {
        console.error("Erro ao carregar dados do gráfico de casos confirmados:", error)
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

  // 🔹 Prepara a lista de valores para o gráfico
  const chartData = todosCiclos.map(d => ({ value: d.casos_confirmados }))

  // 🔹 Total do ciclo selecionado (destacado no gráfico)
  const currentTotal = todosCiclos.find(d => d.ano === anoSelecionado && d.ciclo === cicloSelecionado)?.casos_confirmados ?? 0
  console.log("Ciclo selecionado:", cicloSelecionado, "currentTotal:", currentTotal)

  return (
    <CardMetrica
      title={`Casos Confirmados`}
      data={chartData} // envia todos os ciclos para o gráfico
      currentTotal={currentTotal} // valor do ciclo selecionado
      previousTotal={dados.resumo_ciclo_atual.dados_do_ultimo_ciclo} // valor do último ciclo
      increaseColor="#22c55e"
      decreaseColor="#6A1B9A"
    />
  )
}
