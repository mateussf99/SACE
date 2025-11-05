"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import GraficoBarrasSimples from "@/components/GraficoBarras/GraficoBarrasGenerico/Index"
import { usePeriod } from "@/contexts/PeriodContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "react-toastify"


type Larvicida = {
  tipo?: string | null
  forma?: string | null
  quantidade?: number | null
}

type Adulticida = {
  tipo?: string | null
  quantidade?: number | null
}

type RegistroCampo = {
  registro_de_campo_id: number
  imovel_status?: string | null
  numero_da_amostra?: string | null
  quantiade_tubitos?: number | null
  larvicidas?: Larvicida[] | null
  adulticidas?: Adulticida[] | null
  t?: boolean | null
}



type ResumoImoveis = {
  focal: number
  perifocal: number
  inspecionados: number
  totalTratados: number
  amostrasColetadas: number
  recusas: number
  fechados: number
  tubitos: number
}


function calcularResumo(rawRegistros: RegistroCampo[] | null | undefined): ResumoImoveis {
  const registros = Array.isArray(rawRegistros) ? rawRegistros : []

  const resumo = registros.reduce<ResumoImoveis>(
    (acc, r) => {
      const status = (r.imovel_status ?? "").toLowerCase().trim()

      //  Focal (larvicida)
      const larvicidasLen = Array.isArray(r.larvicidas) ? r.larvicidas.length : 0
      if (larvicidasLen > 0) acc.focal += 1

      //  Perifocal (adulticida)
      const adulticidasLen = Array.isArray(r.adulticidas) ? r.adulticidas.length : 0
      if (adulticidasLen > 0) acc.perifocal += 1

      //  Inspecionados
      if (status === "inspecionado") acc.inspecionados += 1

      //  Recusas
      if (status === "recusado") acc.recusas += 1

      //  Fechados
      if (status === "fechado") acc.fechados += 1

      const numeroAmostra = r.numero_da_amostra
      if (numeroAmostra != null && String(numeroAmostra).trim() !== "") {
        acc.amostrasColetadas += 1
      }
      const tubitosNum = Number(r.quantiade_tubitos ?? 0)
      if (!isNaN(tubitosNum) && isFinite(tubitosNum)) {
        acc.tubitos += tubitosNum
      }
  if (r.t === true) {
        acc.totalTratados += 1
      }

      return acc
    },
    {
      focal: 0,
      perifocal: 0,
      inspecionados: 0,
      totalTratados: 0,
      amostrasColetadas: 0,
      recusas: 0,
      fechados: 0,
      tubitos: 0,
    },
  )


  resumo.totalTratados = resumo.focal + resumo.perifocal

  return resumo
}



export default function GraficoImoveisTratados() {
  const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod()

  const [registros, setRegistros] = useState<RegistroCampo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!anoSelecionado || !cicloSelecionado) return

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem("token") ?? ""

        const { data } = await api.get<RegistroCampo[]>(
          `/registro_de_campo/${anoSelecionado}/${cicloSelecionado}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (!Array.isArray(data)) {
          console.warn("Resposta inesperada de /registro_de_campo:", data)
          setRegistros([])
          setError("Formato de dados inesperado ao carregar registros de campo.")
        } else {
          setRegistros(data)
        }
      } catch (err: any) {
        console.error("Erro ao carregar registros de campo:", err)
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Falha ao carregar registros de campo."
        setError(msg) // toast será disparado pelo useEffect acima
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [anoSelecionado, cicloSelecionado])

  const {
    focal,
    perifocal,
    inspecionados,
    totalTratados,
    amostrasColetadas,
    recusas,
    fechados,
    tubitos,
  } = useMemo(() => calcularResumo(registros), [registros])


  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  if (loading) {
    return (
      <Card className="rounded-2xl  p-4 w-full min-w-[350px] h-full border-none flex flex-col animate-pulse">
        <CardHeader className="flex items-center justify-between p-0 mb-4">
          <CardTitle className="text-xs sm:text-lg md:text-xl xl:text-xl font-semibold bg-gray-200 rounded w-1/3 h-4" />
          <span className="text-[10px] sm:text-xs text-gray-400">
            Carregando...
          </span>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex gap-4">
          <div className="flex-1 bg-gray-100 rounded min-h-[220px]" />
          <div className="w-1/3 flex flex-col gap-3">
            <div className="bg-gray-100 rounded h-16" />
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-100 rounded h-14" />
              <div className="bg-gray-100 rounded h-14" />
              <div className="bg-gray-100 rounded h-14" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }




  const data = [
    { name: "Focal", value: focal },
    { name: "Perifocal", value: perifocal },
    { name: "Inspecionados", value: inspecionados },
  ]

  return (
    <Card className="w-full h-full rounded-lg p-0 border border-none ">


      <CardContent className="p-0 mr-2 h-full">

        <div className="grid gap-0 xl:grid-cols-[1.7fr_1fr] items-center  h-full">

          <div className="h-full">
            <GraficoBarrasSimples
              data={data}
              total={totalTratados}
              title="N° de imóveis tratados"
            />
          </div>

          <div className="flex flex-col gap-3 justify-center items-center mx-auto pb-2">

            <Card className="flex-1 border border-slate-200 rounded-2xl shadow-none">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-2">
                <span className=" text-fluid-large font-medium">
                  Amostras coletadas
                </span>
                <span className="text-lg sm:text-xl font-semibold text-blue-700">
                  {amostrasColetadas}
                </span>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-1">
              <Card className="border border-slate-200 rounded-2xl shadow-none">
                <CardContent className="flex flex-col items-center gap-2 py-2">
                  <span className=" text-fluid-large font-medium">
                    Recusas
                  </span>
                  <span className="text-base font-semibold text-blue-700">
                    {recusas}
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 rounded-2xl shadow-none">
                <CardContent className="flex flex-col items-center gap-2 py-2">
                  <span className=" text-fluid-large font-medium">
                    Fechados
                  </span>
                  <span className="text-base font-semibold text-blue-700">
                    {fechados}
                  </span>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 rounded-2xl shadow-none">
                <CardContent className="flex flex-col items-center gap-2 py-2">
                  <span className="text-fluid-large font-medium">
                    Tubitos
                  </span>
                  <span className="text-base font-semibold text-blue-700">
                    {tubitos}
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>

    </Card>
  )
}
