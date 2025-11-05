import RegistroTabela, { normalize } from "@/components/Tabelas/ImoveisVisitados/Index"
import AreasdeVisita from "@/components/Tabelas/AreasVisita/Index"
import type { BackendRow, RowData } from "@/components/Tabelas/ImoveisVisitados/Index"
import { useRegistros } from "@/hooks/useRegistros"
import { Button } from "@/components/ui/button"
import { ClipboardPlus, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { usePeriod } from "@/contexts/PeriodContext";
import { api } from "@/services/api";
import { useState } from "react";

export default function PaginaListas() {
  const { accessLevel } = useAuth()
  const role = (accessLevel ?? "").toLowerCase()
  const canSeeReport = role.includes("admin") || role.includes("supervisor")
  const { year, cycle } = usePeriod();

  const { raw, setRaw, normalized } =
    useRegistros<BackendRow, RowData>(normalize)

  const [downloading, setDownloading] = useState(false)

  function getFilenameFromDisposition(disposition?: string | null, fallback = "relatorio.pdf") {
    if (!disposition) return fallback
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(disposition)
    const name = decodeURIComponent(match?.[1] || match?.[2] || "")
    return name || fallback
  }

  async function handleDownloadReport() {
    try {
      setDownloading(true)
      const url = `/summary_pdf/${encodeURIComponent(String(year))}/${encodeURIComponent(String(cycle))}`
      const response = await api.get(url, { responseType: "blob" })
      const filename =
        getFilenameFromDisposition(response.headers["content-disposition"], `relatorio-trabalho-${year}-ciclo-${cycle}.pdf`)

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error(e)
      alert("Não foi possível baixar o relatório. Tente novamente.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-secondary min-h-screen w-full pt-2 flex flex-col gap-6 px-4 pb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Button
          className="h-20 w-full rounded-md px-5 font-medium text-white text-base md:text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-sm"
        >
          <ClipboardPlus className="mr-1 !h-6 !w-6 shrink-0" />
          Cadastrar  casos confirmados
        </Button>

        {canSeeReport && (
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="h-20 text-base md:text-lg bg-gradient-to-r from-white to-white hover:from-white hover:to-gray-400 text-blue-darck"
          >
            {downloading ? (
              <Loader2 className="mr-1 !h-6 !w-6 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="mr-1 !h-6 !w-6 shrink-0 text-muted-foreground" />
            )}
            {downloading ? "Gerando..." : "Baixar relatório de trabalho"}
          </Button>
        )}
      </div>

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
