"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto

type RegistroDeCampo = {
  registro_de_campo_id?: number
  deposito?: Record<string, number | null>
  ciclo?: { ciclo: number; ano: number; ciclo_id: number }
}

export default function GraficoImoveisTrabalhados() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod() // valores automáticos do contexto
  const [dados, setDados] = useState<{ name: string; value: number }[]>([])
  const [totalImoveis, setTotalImoveis] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return // evita chamada se não tiver valores ainda

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data: registros } = await api.get<RegistroDeCampo[]>("/registro_de_campo", {
          headers: { Authorization: `Bearer ${token}` },
        })

        // 🔹 Filtra apenas os registros do ciclo e ano selecionados
        const registrosFiltrados = registros.filter(r =>
          r.ciclo?.ano === anoSelecionado && r.ciclo?.ciclo === cicloSelecionado
        )

        setTotalImoveis(registrosFiltrados.length)

        // 🔹 Soma dinâmica de cada tipo de deposito dentro do ciclo
        const somaDepositos: Record<string, number> = {}
        registrosFiltrados.forEach(r => {
          const deposito = r.deposito || {}
          Object.entries(deposito).forEach(([tipo, valor]) => {
            const numVal = Number(valor) || 0
            somaDepositos[tipo] = (somaDepositos[tipo] || 0) + numVal
          })
        })

        // 🔹 Prepara os dados finais para o gráfico
        const dataChart = Object.entries(somaDepositos)
          .filter(([_, value]) => value > 0) // ignora depósitos zerados
          .map(([tipo, value]) => ({
            name: tipo.toUpperCase(),
            value,
          }))

        setDados(dataChart)

      } catch (error) {
        console.error("Erro ao carregar dados do gráfico:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [anoSelecionado, cicloSelecionado])

  if (loading) return <p>Carregando gráfico...</p>
  if (dados.length === 0) return <p>Nenhum dado disponível.</p>

  return (
    <GraficoBarrasSimples
      data={dados}
      total={totalImoveis}
      title={"Focos Encontrados "}
    />
  )
}
