"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RegistroDeCampo = {
  registro_de_campo_id?: number
  deposito?: Record<string, number | null>
  ciclo?: {
    ciclo: number
    ano_de_criacao?: string
  }
}

export default function GraficoImoveisTrabalhados() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod()
  const [dados, setDados] = useState<{ name: string; value: number }[]>([])
  const [totalImoveis, setTotalImoveis] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""


        const { data: registros } = await api.get<RegistroDeCampo[]>(
          `/registro_de_campo/${anoSelecionado}/${cicloSelecionado}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        setTotalImoveis(registros.length)

        const somaDepositos: Record<string, number> = {}

        registros.forEach(r => {
          const deposito = r.deposito || {}
          Object.entries(deposito).forEach(([tipo, valor]) => {
            const numVal = Number(valor) || 0
            somaDepositos[tipo] = (somaDepositos[tipo] || 0) + numVal
          })
        })

        const dataChart = Object.entries(somaDepositos)
          .filter(([_, value]) => value > 0)
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

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-none p-4 w-full min-w-[350px] h-full border-none flex flex-col animate-pulse">
        <CardHeader className="flex items-center justify-between p-0">
          <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold bg-gray-200 rounded w-1/3 h-4" />{" "}
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
      total={totalImoveis}
      title={"Focos Encontrados "}
    />
  )
}
