"use client"

import { useState, useEffect } from "react"
import RegistroTabela, { normalize } from "@/components/Tabelas/ImoveisVisitados/Index"
import AreasdeVisita from "@/components/Tabelas/AreasVisita/Index"
import type { BackendRow, RowData } from "@/components/Tabelas/ImoveisVisitados/Index"
import type { BackendRow as AreaBackendRow } from "@/components/Tabelas/AreasVisita/Index"
import DenunciasTabela, { type Denuncia } from "@/components/Tabelas/Denuncias/Index"
import { ConfirmarCasosModal } from "@/components/atualizarFocosConfirmados/index"



import { useRegistros } from "@/hooks/useRegistros"
import { Button } from "@/components/ui/button"
import { ClipboardPlus, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { usePeriod } from "@/contexts/PeriodContext"
import { api } from "@/services/api"
import DoencasConfirmadasModal from "@/components/doencas/Index"


function decodeJwtPayload<T = any>(token: string | null): T | null {
  if (!token) return null
  try {
    const [, payloadB64] = token.split(".")
    if (!payloadB64) return null
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

const coerceNum = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

type JwtPayload = {
  agente_id?: number | string
  nivel_de_acesso?: string
}

type AreasDenunciasResponse = {
  areas_de_visitas: AreaBackendRow[]
  denuncias: Denuncia[]
}

export default function PaginaListas() {
  const { accessLevel } = useAuth()
  const role = (accessLevel ?? "").toLowerCase()
  const isAgente = role.includes("agente")
  const canSeeReport = role.includes("admin") || role.includes("supervisor")
  const { year, cycle } = usePeriod()
  const [doencasModalOpen, setDoencasModalOpen] = useState(false)

  const [casosAgenteModalOpen, setCasosAgenteModalOpen] = useState(false)
  const [agenteId, setAgenteId] = useState<number | null>(null)


  const { raw: _raw, setRaw, normalized } =
    useRegistros<BackendRow, RowData>(normalize)

  const [downloading, setDownloading] = useState(false)

  const [areasAgente, setAreasAgente] = useState<AreaBackendRow[]>([])
  const [denunciasAgente, setDenunciasAgente] = useState<Denuncia[]>([])
  const [loadingAgenteDados, setLoadingAgenteDados] = useState(false)
  const [erroAgenteDados, setErroAgenteDados] = useState<string | null>(null)


  const [showAreas, setShowAreas] = useState(true)
  const [showDenuncias, setShowDenuncias] = useState(true)
  const [showVisitados, setShowVisitados] = useState(true)
  const [showNaoVisitados, setShowNaoVisitados] = useState(true)

  function getFilenameFromDisposition(
    disposition?: string | null,
    fallback = "relatorio.pdf",
  ) {
    if (!disposition) return fallback
    const match =
      /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(disposition)
    const name = decodeURIComponent(match?.[1] || match?.[2] || "")
    return name || fallback
  }

  async function handleDownloadReport() {
    try {
      setDownloading(true)
      const url = `/summary_pdf/${encodeURIComponent(String(year))}/${encodeURIComponent(String(cycle))}`
      const response = await api.get(url, { responseType: "blob" })
      const filename = getFilenameFromDisposition(
        response.headers["content-disposition"],
        `relatorio-trabalho-${year}-ciclo-${cycle}.pdf`,
      )
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

  useEffect(() => {
    if (!isAgente) return

    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) return

    const payload = decodeJwtPayload<JwtPayload>(token)
    const tokenId = coerceNum(payload?.agente_id)
    if (tokenId == null) return

    const carregar = async () => {
      setLoadingAgenteDados(true)
      setErroAgenteDados(null)

      try {
        let idParaAreas = tokenId

        try {
          // 1) Buscar todos os agentes
          const { data: usuariosResp } = await api.get("/usuarios", {
            headers: { Authorization: `Bearer ${token}` },
          })

          const agentes = Array.isArray(usuariosResp.agentes)
            ? usuariosResp.agentes
            : []

          // 2) Achar o agente logado pelo id do token
          const agenteLogado = agentes.find(
            (a: any) =>
              a.agente_id === tokenId || a.usuario_id === tokenId,
          )

          if (agenteLogado) {
            // Se o tokenId bate com usuario_id, provavelmente o back
            // está usando agente_id nas áreas → corrigimos aqui
            if (
              agenteLogado.usuario_id === tokenId &&
              agenteLogado.agente_id != null
            ) {
              idParaAreas = agenteLogado.agente_id
            }

            // Guardar o agente_id real para outros usos (ex: ConfirmarCasosModal)
            setAgenteId(agenteLogado.agente_id ?? tokenId)
          } else {
            // fallback se não encontrar nada
            setAgenteId(tokenId)
          }
        } catch (e) {
          console.error("Erro ao tentar resolver agente_id/usuario_id:", e)
          // fallback: usa o id do token mesmo
          setAgenteId(tokenId)
        }

        // 3) Agora usa o idParaAreas para áreas e denúncias
        const { data } = await api.get<AreasDenunciasResponse>(
          `/area_de_visita_denuncias/${idParaAreas}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        setAreasAgente(data.areas_de_visitas ?? [])
        setDenunciasAgente(data.denuncias ?? [])
      } catch (e) {
        console.error(e)
        setErroAgenteDados(
          "Erro ao carregar áreas de visita e denúncias do agente.",
        )
        setAreasAgente([])
        setDenunciasAgente([])
      } finally {
        setLoadingAgenteDados(false)
      }
    }

    carregar()
  }, [isAgente])


  const Header = ({
    title,
    open,
    onToggle,
  }: {
    title: string
    open: boolean
    onToggle: () => void
  }) => (
    <button
      onClick={onToggle}
      className="flex text-left text:sm md:text-lg lg:text-xl 2xl:text-2xl font-semibold text-gray-800 px-4 py-3 "
    >
      <span>{title}</span>
      {open ? (
        <ChevronUp className="w-7 h-7 text-blue-700 ml-2" />
      ) : (
        <ChevronDown className="w-7 h-7 text-blue-700 ml-2" />
      )}
    </button>
  )

  return (
    <div className="bg-secondary min-h-screen w-full pt-2 flex flex-col gap-6 px-4 pb-6">
      <div
        className={`grid gap-4 ${isAgente ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
          }`}
      >

        <Button
          className="h-20 w-full rounded-md px-5 font-medium text-white text-base md:text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-sm "
          onClick={() => {
            if (isAgente) {
              setCasosAgenteModalOpen(true)
            } else {
              setDoencasModalOpen(true)
            }
          }}
        >
          <ClipboardPlus className="!h-6 !w-6 shrink-0" />
          {isAgente ? "Atualizar focos positivos" : "Cadastrar casos confirmados"}
        </Button>

        {canSeeReport && (
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="h-20 text-base md:text-lg bg-gradient-to-r from-white to-white hover:from-white hover:to-gray-400 text-blue-darck"
          >
            {downloading ? (
              <Loader2 className="!h-6 !w-6 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="!h-6 !w-6 shrink-0 text-muted-foreground" />
            )}
            {downloading ? "Gerando..." : "Baixar relatório de trabalho"}
          </Button>
        )}
      </div>

      {isAgente && erroAgenteDados && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {erroAgenteDados}
        </div>
      )}

      {/* IMÓVEIS NÃO INSPECIONADOS */}
      <div className="">
        <Header
          title="Imóveis não visitados"
          open={showNaoVisitados}
          onToggle={() => setShowNaoVisitados(p => !p)}
        />
        {showNaoVisitados && (
          <div className="p-2 bg-white rounded-xl ">
            <RegistroTabela normalized={normalized} setRaw={setRaw} variant="apenasNaoInspecionados" />
          </div>
        )}
      </div>

      {/* DENÚNCIAS */}
      {isAgente && (
        <div className="">
          <Header title="Denúncias" open={showDenuncias} onToggle={() => setShowDenuncias(p => !p)} />
          {showDenuncias && (
            <div className="p-2 bg-white rounded-xl">
              <DenunciasTabela initialData={denunciasAgente} disableOwnFetch />
              {loadingAgenteDados && (
                <p className="text-xs text-gray-500 mt-2">Carregando dados...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* IMÓVEIS VISITADOS */}
      <div className="">
        <Header title="Imóveis visitados" open={showVisitados} onToggle={() => setShowVisitados(p => !p)} />
        {showVisitados && (
          <div className="p-2 bg-white rounded-xl">
            <RegistroTabela normalized={normalized} setRaw={setRaw} variant="semNaoInspecionados" />
          </div>
        )}
      </div>

      {/* ÁREAS DE VISITA */}
      {isAgente && (
        <div className="">
          <Header title="Áreas de visita" open={showAreas} onToggle={() => setShowAreas(p => !p)} />
          {showAreas && (
            <div className="p-2 bg-white rounded-xl">
              {isAgente ? (
                <AreasdeVisita initialDataRaw={areasAgente} disableOwnFetch />
              ) : (
                <AreasdeVisita />
              )}
              {isAgente && loadingAgenteDados && (
                <p className="text-xs text-gray-500 mt-2">Carregando dados...</p>
              )}
            </div>
          )}
        </div>
      )}


      {!isAgente && (
        <DoencasConfirmadasModal
          open={doencasModalOpen}
          onOpenChange={setDoencasModalOpen}
        />
      )}


      {isAgente && agenteId != null && (
        <ConfirmarCasosModal
          open={casosAgenteModalOpen}
          onOpenChange={setCasosAgenteModalOpen}
          agenteId={agenteId}
        />
      )}


    </div>
  )
}
