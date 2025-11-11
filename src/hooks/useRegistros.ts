"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import { usePeriod } from "@/contexts/PeriodContext"

export type UseRegistrosState<Raw, Row> = {
  raw: Raw[]
  setRaw: React.Dispatch<React.SetStateAction<Raw[]>>
  normalized: Row[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

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

function coerceNum(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

function normalizeLevel(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim().toLowerCase()
  return s || null
}

type JwtPayload = {
  agente_id?: number | string
  nivel_de_acesso?: string
}

type AreasDenunciasResponse = {
  areas_de_visitas?: Array<{
    area_de_visita_id?: number
    id?: number
    [k: string]: any
  }>
  denuncias?: any[]
}

export function useRegistros<Raw, Row>(
  normalizer: (r: Raw) => Row,
): UseRegistrosState<Raw, Row> {
  const { year, cycle } = usePeriod()

  const [raw, setRaw] = useState<Raw[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const accessLevelLS =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_access_level")
      : null

  const payload = useMemo(
    () => decodeJwtPayload<JwtPayload>(token),
    [token],
  )

  const agenteId = useMemo(() => coerceNum(payload?.agente_id), [payload])

  const accessLevel = useMemo(
    () =>
      normalizeLevel(payload?.nivel_de_acesso) ??
      normalizeLevel(accessLevelLS),
    [payload, accessLevelLS],
  )

  const isAgente = accessLevel === "agente"
  const mustFilterByAgente = isAgente

  const load = async () => {
    if (!token) {
      setError("Sessão inválida: token ausente.")
      setRaw([])
      return
    }

    if (year == null || cycle == null) {
      setError(null)
      setRaw([])
      return
    }

    if (mustFilterByAgente && agenteId == null) {
      setError("Não foi possível identificar o agente_id no token.")
      setRaw([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 🔹 CASO 1: não é agente → vê todos os registros do ano/ciclo
      if (!mustFilterByAgente) {
        const res = await api.get(`/registro_de_campo/${year}/${cycle}`)
        const data = Array.isArray(res.data) ? (res.data as Raw[]) : []
        setRaw(data)
        return
      }

      // 🔹 CASO 2: é agente → precisa filtrar pelas áreas do agente

      // 1) Busca as áreas de visita vinculadas ao agente
      const { data: areasResp } = await api.get<AreasDenunciasResponse>(
        `/area_de_visita_denuncias/${agenteId}`,
      )

      const areas = Array.isArray(areasResp?.areas_de_visitas)
        ? areasResp.areas_de_visitas
        : []

      const areaIds = Array.from(
        new Set(
          areas
            .map((a) => a.area_de_visita_id ?? (a as any).id)
            .filter((id) => id != null),
        ),
      ) as number[]

      if (!areaIds.length) {
        setRaw([])
        setError(
          "Nenhuma área de visita atribuída ao agente para o período selecionado.",
        )
        return
      }

      // 2) Busca TODOS os registros do ano/ciclo
      const resHistorico = await api.get(
        `/registro_de_campo/${year}/${cycle}`,
      )

      const todos = Array.isArray(resHistorico.data)
        ? (resHistorico.data as any[])
        : []

      const areaIdSet = new Set(areaIds)

      // 3) Filtra somente registros das áreas vinculadas ao agente
      const filtradosPorArea = todos.filter((item: any) => {
        const areaIdItem =
          item?.area_de_visita_id ??
          item?.area_de_visita?.area_de_visita_id ??
          item?.area_de_visita?.id
        return areaIdItem != null && areaIdSet.has(areaIdItem)
      }) as Raw[]

      setRaw(filtradosPorArea)
    } catch (e: any) {
      console.error(e)
      if (e?.response?.status === 404) {
        setError("Ciclo não encontrado para o ano e ciclo selecionados.")
      } else {
        setError("Erro ao carregar dados do servidor.")
      }
      setRaw([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [year, cycle, token, accessLevel])

  const normalized = useMemo(
    () => raw.map(normalizer),
    [raw, normalizer],
  )

  return { raw, setRaw, normalized, loading, error, reload: load }
}
