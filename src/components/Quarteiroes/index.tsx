"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

type AreaDeVisita = {
  area_de_visita_id: number
  bairro: string
  cep: string
  estado: string
  logadouro: string
  municipio: string
  numero_quarteirao: number
  setor: string
  status: string
}

export default function QuarteiroesTrabalhados() {
  const [quarteiroes, setQuarteiroes] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function carregarQuarteiroes() {
      try {
        setLoading(true)
        setError(null)

        const response = await api.get<AreaDeVisita[]>("/area_de_visita")

        const visitados = response.data
          .filter((area) => area.status === "Visitado")
          .map((area) => area.numero_quarteirao)

        const unicosOrdenados = Array.from(new Set(visitados)).sort(
          (a, b) => a - b,
        )

        setQuarteiroes(unicosOrdenados)
      } catch (err) {
        console.error(err)
        setError("Não foi possível carregar os quarteirões trabalhados.")
      } finally {
        setLoading(false)
      }
    }

    carregarQuarteiroes()
  }, [])

  const formatarQuarteirao = (numero: number) =>
    numero.toString().padStart(3, "0")

  const mostrarEsqueleto =
    loading || (!loading && !error && quarteiroes.length === 0)

  return (
    <Card className="w-full pt-4 pl-0 pr-0 pb-0 rounded-xl border-none bg-white shadow-none">
      <CardHeader className="pb-0">
        <CardTitle className="text-center text-lg xl:text-xl text-gray-800 font-semibold">
          Quarteirões trabalhados
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">

  {!loading && error && (
    <div className="flex justify-center">
      <div
        className="
          grid gap-0
          grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
          bg-slate-50 border border-slate-200 overflow-hidden
          w-full 
        "
      >

        <div className="col-span-full flex justify-center border-b border-slate-200 py-2 bg-white">
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>


        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center border border-slate-200 py-3"
          >
            <div className="h-5 w-8 bg-slate-200 rounded"></div>
          </div>
        ))}

        <div className="col-span-full py-6 bg-white text-center">
          <p className="text-sm font-medium">
            {error || "Erro ao carregar os dados"}
          </p>
          <p className="text-sm text-slate-500">
            Verifique sua conexão ou tente novamente mais tarde.
          </p>
        </div>
      </div>
    </div>
  )}

  {mostrarEsqueleto && !error && (
    <div className="flex justify-center">
      <div
        className="
          grid gap-0
          grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
          bg-slate-50 border border-slate-200 overflow-hidden
          w-full rounded-b-2xl animate-pulse
        "
      >

        <div className="col-span-full flex justify-center border-b border-slate-200 py-2 bg-white">
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>


        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center border border-slate-200 py-3"
          >
            <div className="h-5 w-8 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* === ESTADO: DADOS REAIS === */}
  {!loading && !error && quarteiroes.length > 0 && (
    <div className="flex justify-center">
      <div
        className="
          grid gap-0
          grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8
          bg-slate-50 border border-slate-200 overflow-hidden
          w-full rounded-b-lg
        "
      >
        <div className="col-span-full flex justify-center border-b border-slate-200 py-2 bg-white text-sm font-semibold text-slate-700">
          Número
        </div>

        {quarteiroes.map((numero) => (
          <div
            key={numero}
            className="
              flex items-center justify-center
              border border-slate-200
              text-base font-bold text-blue-600
              py-3
            "
          >
            {formatarQuarteirao(numero)}
          </div>
        ))}
      </div>
    </div>
  )}
</CardContent>

    </Card>
  )
}
