"use client"

import RegistroTabela, { normalize } from "@/components/Tabelas/ImoveisVisitados/Index"
import AreasdeVisita from "@/components/Tabelas/AreasVisita/Index"
import type { BackendRow, RowData } from "@/components/Tabelas/ImoveisVisitados/Index"
import { useRegistros } from "@/hooks/useRegistros" // ajuste o path
import { usePeriod } from "@/contexts/PeriodContext"
import { Area } from "recharts"

export default function PaginaListas() {

  const { raw, setRaw, normalized, loading, error } =
    useRegistros<BackendRow, RowData>(normalize)

  return (
 <div className="bg-secondary min-h-screen min-h-[100dvh] w-full mt-2 flex flex-col gap-6 px-4 pb-6">

      <div className="rounded-lg bg-white shadow">
        <AreasdeVisita />
      </div>

      <div className="rounded-lg bg-white shadow">
        <RegistroTabela
          normalized={normalized}
          setRaw={setRaw}
          variant="semNaoInspecionados"
          titulo="Imóveis visitados"
        />
      </div>

      {/* 2) Tabela APENAS não-inspecionados */}
      <div className="rounded-lg bg-white shadow">
        <RegistroTabela
          normalized={normalized}
          setRaw={setRaw}
          variant="apenasNaoInspecionados"
          titulo="Imóveis não inspecionados"
        />
      </div>

    </div>
  )
}
