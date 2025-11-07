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


export function useRegistros<Raw, Row>(
  normalizer: (r: Raw) => Row
): UseRegistrosState<Raw, Row> {
  const { year, cycle } = usePeriod()
  const [raw, setRaw] = useState<Raw[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const accessLevelLS =
    typeof window !== "undefined" ? localStorage.getItem("auth_access_level") : null

  const payload = useMemo(
    () => decodeJwtPayload<{ agente_id?: number | string; nivel_de_acesso?: string }>(token),
    [token]
  )

  const agenteId = useMemo(() => coerceNum(payload?.agente_id), [payload])

  const accessLevel = useMemo(
    () => normalizeLevel(payload?.nivel_de_acesso) ?? normalizeLevel(accessLevelLS),
    [payload, accessLevelLS]
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
      const res = await api.get(`/registro_de_campo/${year}/${cycle}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = Array.isArray(res.data) ? (res.data as Raw[]) : []

      const result =
        mustFilterByAgente
          ? data.filter((item: any) => coerceNum(item?.agente_id) === agenteId)
          : data

      setRaw(result)
    } catch (e) {
      console.error(e)
      setError("Erro ao carregar dados do servidor")
      setRaw([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()

  }, [year, cycle, token, accessLevel])

  const normalized = useMemo(() => raw.map(normalizer), [raw, normalizer])

  return { raw, setRaw, normalized, loading, error, reload: load }
}
