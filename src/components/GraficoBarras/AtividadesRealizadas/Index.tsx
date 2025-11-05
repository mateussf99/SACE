"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext" // import do contexto
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

   if (loading) {
  return (
    <Card className="rounded-2xl shadow-none p-4 w-full min-w-[350px] h-full border-none flex flex-col animate-pulse">
      <CardHeader className="flex items-center justify-between p-0">
        <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold bg-gray-200 rounded w-1/3 h-4" /> <span>Carregando...</span>
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
      title="Atividades Realizadas"

    />
  )
}
