"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Registro {
  imovel_tipo: string
}

export default function GraficoImoveisPorTipo() {
  const { year: ano, cycle: cicloSelecionado } = usePeriod()
  const [dados, setDados] = useState<{ name: string; value: number }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ano || !cicloSelecionado) return

    async function fetchData() {
      setLoading(true)
      try {
        const token = localStorage.getItem("token") ?? ""
        const { data } = await api.get<Registro[]>(
          `/registro_de_campo/${ano}/${cicloSelecionado}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        // Mapa direto dos valores do select
        const mapa: Record<string, "R" | "C" | "TB" | "PE"> = {
          "Residência": "R",
          "Comércio": "C",
          "Terreno Baldio": "TB",
          "Ponto Estratégico": "PE",
        }

        const contagem: Record<string, number> = {
          R: 0,
          C: 0,
          TB: 0,
          PE: 0,
          Outro: 0,
        }

        data.forEach((item) => {
          const tipo = (item.imovel_tipo ?? "").trim()
          const codigo = mapa[tipo] ?? "Outros"
          contagem[codigo] += 1
        })

        const totalItens = Object.values(contagem).reduce((a, b) => a + b, 0)
        setTotal(totalItens)

        const dataChart = Object.entries(contagem)
          .map(([codigo, value]) => ({
            name: codigo,
            value,
          }))
          .filter(({ value }) => value > 0)

        setDados(dataChart)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setDados([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [ano, cicloSelecionado])

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
      total={total}
      title="Tipos de Imóveis"
    />
  )
}
