"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type EditorArgs<T> = {
  field: keyof T
  value: T[keyof T] | undefined
  label: string
  onChange: (next: any) => void
  data: T | null
  formData: Partial<T>
}

type ViewerArgs<T> = {
  field: keyof T
  value: T[keyof T] | undefined
  label: string
  data: T | null
}

interface ModalDetalhesProps<T extends Record<string, any>> {
  id: number | null
  endpoint: string
  campos: (keyof T | string)[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (updated: any) => void
  canEdit?: boolean


  ////////////////////////////////////////////////

  /////////////////////////////////////////

  // Renderização e rótulos
  fieldLabels?: Partial<Record<keyof T, string>>
  renderField?: (field: keyof T, value: T[keyof T]) => React.ReactNode // fallback legado
  nomeDoCampo?: string // campo de imagem (genérico: mostra imagem + input type=file)

  // Edição
  editableFields?: (keyof T)[]
  selectFields?: (keyof T)[]
  selectOptions?: Partial<Record<keyof T, Array<{ value: any; label: string }>>>

  // Layout
  fieldsTwoColumns?: (keyof T)[]
  fieldsThreeColumns?: (keyof T)[]
  fieldsFullWidth?: (keyof T)[]

  // Envio
  sendAsJson?: boolean
  onBeforeSubmit?: (payload: any) => any | FormData

  // 🔌 Extensões (específicas ficam fora do modal)
  customEditors?: Partial<Record<string, (args: EditorArgs<T>) => React.ReactNode>>
  customViewers?: Partial<Record<string, (args: ViewerArgs<T>) => React.ReactNode>>

  // Como o modal lida com arrays genéricos se não houver editor custom:
  // - "none": nunca edita arrays sozinho (delega sempre ao customEditor)
  // - "primitive-tags": edita apenas string[]/number[] como chips
  arrayEditingStrategy?: "none" | "primitive-tags"
}

export default function ModalDetalhes<T extends Record<string, any>>({
  id,
  endpoint,
  campos,
  open,
  onOpenChange,
  fieldLabels = {},
  renderField, // fallback
  nomeDoCampo,
  editableFields = [],
  selectFields = [],
  selectOptions = {},
  fieldsTwoColumns = [],
  fieldsThreeColumns = [],
  fieldsFullWidth = [],
  sendAsJson = false,
  onBeforeSubmit,
  customEditors = {},
  customViewers = {},
  arrayEditingStrategy = "primitive-tags",
  onSaved,
  canEdit = true,
}: ModalDetalhesProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [formData, setFormData] = useState<Partial<T>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null)
  const [novosValores, setNovosValores] = useState<Record<string, string>>({})

  const DEPOSITOS_KEYS = ["a1", "a2", "b", "c", "d1", "d2", "e"] as const
  function flattenDeposito<T extends Record<string, any>>(obj: T | null): T | null {
    if (!obj || typeof obj !== "object") return obj
    const out: any = { ...obj }
    const dep = (obj as any).deposito
    if (dep && typeof dep === "object") {
      for (const k of DEPOSITOS_KEYS) if (k in dep) out[k] = dep[k]
    }
    return out
  }
  // Buscar dados
  useEffect(() => {
    if (!id || !open) return
    setLoading(true)
    setError(null)
      ; (async () => {
        try {
          const res = await api.get(`${endpoint}/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
          })
          setData(flattenDeposito(res.data))
        } catch {
          setError("Erro ao carregar dados")
          setData(null)
        } finally {
          setLoading(false)
        }
      })()
  }, [id, endpoint, open])





  // 🔎 Helpers de debug
  const isFormData = (x: any): x is FormData =>
    typeof FormData !== "undefined" && x instanceof FormData

  const dumpFormData = (fd: FormData) => {
    const rows: Array<{ key: string; value: string }> = []
    for (const [k, v] of fd.entries()) {
      if (v instanceof File) {
        rows.push({ key: k, value: `[File] name=${v.name} size=${v.size} type=${v.type}` })
      } else {
        rows.push({ key: k, value: String(v) })
      }
    }
    // Mostra em formato de tabela e também printa linha a linha
    console.groupCollapsed("🔎 FormData — campos")
    console.table(rows)
    rows.forEach(r => console.log(`→ ${r.key}:`, r.value))
    console.groupEnd()
  }

  const dumpJson = (obj: any) => {
    try {
      console.groupCollapsed("🔎 JSON payload")
      console.log(JSON.stringify(obj, null, 2))
      console.groupEnd()
    } catch {
      console.log("🔎 JSON payload (raw):", obj)
    }
  }

  const dumpAxiosError = (e: any) => {
    console.group("🛑 PUT erro")
    console.log("status:", e?.response?.status)
    console.log("statusText:", e?.response?.statusText)
    console.log("headers:", e?.response?.headers)
    console.log("data:", e?.response?.data)
    // Se vier no padrão { errors: {campo: [msgs]} }
    const server = e?.response?.data
    if (server?.errors && typeof server.errors === "object") {
      const flat = Object.entries(server.errors).map(
        ([k, v]: any) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
      )
      console.log("fieldErrors:", flat.join(" | "))
    }
    console.log("request url:", e?.config?.url)
    console.log("request method:", e?.config?.method)
    console.log("request headers:", e?.config?.headers)
    console.log("request data (bruto):", e?.config?.data)
    console.groupEnd()
  }






















  const handleChange = (field: keyof T, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const buildUnifiedPayload = (base: Partial<T>) => {
    const prepared = typeof onBeforeSubmit === "function" ? onBeforeSubmit(base) : base
    if (sendAsJson) return prepared
    if (prepared instanceof FormData) return prepared

    const fd = new FormData()
    Object.entries(prepared as Record<string, any>).forEach(([k, v]) => {
      if (v == null) return
      if (v instanceof File) fd.append(k, v)
      else if (typeof v === "boolean") fd.append(k, v ? "true" : "false")
      else if (Array.isArray(v) || typeof v === "object") fd.append(k, JSON.stringify(v))
      else fd.append(k, String(v))
    })
    return fd
  }

  const handleAplicar = async () => {
    if (!id || !data) return

    if (!canEdit) return 
    
    setLoading(true)
    setMensagem(null)
    setError(null)
    try {
      const payloadObj: Partial<T> = { ...data }
      editableFields.forEach((field) => {
        if (formData[field] !== undefined) payloadObj[field] = formData[field] as T[keyof T]
      })

      const unifiedPayload = buildUnifiedPayload(payloadObj)


      // 🔎 DEBUG: o que será enviado
      console.group("🚀 PUT /registro_de_campo debug")
      console.log("endpoint:", `${endpoint}/${id}`)
      console.log("headers.Content-Type:", sendAsJson ? "application/json" : "(multipart será definido pelo browser)")
      if (isFormData(unifiedPayload)) dumpFormData(unifiedPayload)
      else dumpJson(unifiedPayload)
      console.groupEnd()

      const resp = await api.put(`${endpoint}/${id}`, unifiedPayload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          ...(sendAsJson ? { "Content-Type": "application/json" } : {}),
        },
      })

      const serverData = resp?.data?.data ?? null
      const merged =
        serverData
          ? flattenDeposito(serverData)
          : flattenDeposito({ ...(data as any), ...(payloadObj as any) })

      // ⬇️ NOVO: atualiza o estado do modal imediatamente
      if (merged) setData(merged as T)


      setMensagem({ tipo: "sucesso", texto: "Atualizado com sucesso!" })
      setModoEdicao(false)
      setFormData({})
      onSaved?.(merged ?? payloadObj)
    } catch (e: any) {
      dumpAxiosError(e)
      const status = e?.response?.status
      const server = e?.response?.data
      const fieldErrors =
        (server?.errors && typeof server.errors === "object")
          ? Object.entries(server.errors).map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" | ")
          : null

      // const msg = server?.message ?? fieldErrors ??
      //   (status === 400 && "Requisição inválida.") ||
      //   (status === 401 && "Não autenticado ou sem permissão.") ||
      //   (status === 404 && "Registro não encontrado.") ||
      //   "Erro ao atualizar os dados."
      // setMensagem({ tipo: "erro", texto: msg })
    } finally {
      setLoading(false)
    }
  }

  // ==== Helpers genéricos ====
  const labelOf = (campo: keyof T) => fieldLabels[campo] ?? String(campo)
  const isPrimitiveArray = (arr: any[]) =>
    arr.every(v => ["string", "number", "boolean"].includes(typeof v))

  // ==== Render de campo (usa editores/visualizadores custom quando existirem) ====
  const renderCampo = (campo: keyof T, valor: T[keyof T]) => {
    const value = formData[campo] ?? valor
    const isEditable = modoEdicao && editableFields.includes(campo)
    const label = labelOf(campo)
    const editorKey = String(campo)
    const viewerKey = String(campo)

    // Imagem genérica (mantida)
    if (campo === (nomeDoCampo as keyof T) && value) {
      return (
        <div className="flex flex-col gap-2">
          <strong>{label}:</strong>
          <img
            src={`${endpoint}/img/${(data as any)?.artigo_id}`}
            alt={String(valor)}
            className="w-40 h-40 object-cover rounded border"
          />
          <span>{String(valor)}</span>
          {modoEdicao && (
            <label className="cursor-pointer text-blue-700 underline text-sm mt-1">
              Selecionar nova imagem
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleChange(campo, e.target.files[0])}
              />
            </label>
          )}
        </div>
      )
    }

    // 1) EDIT MODE: editor custom tem prioridade total
    if (isEditable && customEditors[editorKey]) {
      return customEditors[editorKey]!({
        field: campo,
        value,
        label,
        onChange: (next) => handleChange(campo, next),
        data,
        formData,
      })
    }

    // 2) VIEW MODE: viewer custom tem prioridade total
    if (!isEditable && customViewers[viewerKey]) {
      return customViewers[viewerKey]!({
        field: campo,
        value,
        label,
        data,
      })
    }

    // 3) EDIT MODE: comportamentos genéricos (checkbox/select/texto/arrays simples)
    if (isEditable) {
      // boolean → checkbox
      if (typeof value === "boolean") {
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={Boolean(value)}
              onChange={(e) => handleChange(campo, e.target.checked as any)}
            />
            <span className="select-none">{label}</span>
          </label>
        )
      }

      // select
      if (selectFields.includes(campo)) {
        return (
          <div className="flex flex-col w-full">
            <strong>{label}:</strong>
            <select
              value={value ?? ""}
              onChange={e => handleChange(campo, e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {selectOptions[campo]?.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )
      }

      // arrays genéricos (opcional): só primitivos, estilo chips
      if (Array.isArray(value) && arrayEditingStrategy === "primitive-tags" && isPrimitiveArray(value)) {
        const key = String(campo)
        const novoValor = novosValores[key] ?? ""
        const add = () => {
          if (!novoValor.trim()) return
          const cast =
            typeof (value[0] ?? "") === "number" ? Number(novoValor) :
              typeof (value[0] ?? "") === "boolean" ? (novoValor === "true") :
                novoValor
          handleChange(campo, [...(value as any[]), cast])
          setNovosValores(p => ({ ...p, [key]: "" }))
        }
        const removeAt = (i: number) =>
          handleChange(campo, (value as any[]).filter((_, x) => x !== i))

        return (
          <div className="flex flex-col w-full mb-2">
            <strong>{label}:</strong>
            <div className="flex flex-wrap gap-2 mt-1">
              {(value as any[]).map((item, i) => (
                <div key={i} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm">
                  <span>{String(item)}</span>
                  <button onClick={() => removeAt(i)} className="ml-2 text-red-600 hover:text-red-800">×</button>
                </div>
              ))}
              {!value.length && <span className="text-sm text-gray-500">Nenhum</span>}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Novo item"
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                value={novoValor}
                onChange={e => setNovosValores(p => ({ ...p, [key]: e.target.value }))}
              />
              <button onClick={add} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                Inserir
              </button>
            </div>
          </div>
        )
      }

      // default: texto
      return (
        <div className="flex flex-col w-full">
          <strong>{label}:</strong>
          <input
            type="text"
            value={String(value ?? "")}
            onChange={e => handleChange(campo, e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 mt-1"
          />
        </div>
      )
    }

    // 4) VIEW MODE genérico (arrays tentam mapear labels de selectOptions)
    if (Array.isArray(value)) {
      const joined = (value as any[]).map((item: any) => {
        if (typeof item === "object" && item !== null) {
          const matchedKey = Object.keys(selectOptions).find(key =>
            selectOptions[key as keyof typeof selectOptions]?.some(opt => opt.value === item?.id || opt.value === item?.agente_id)
          )
          if (!matchedKey) return JSON.stringify(item)
          const found = selectOptions[matchedKey as keyof typeof selectOptions]?.find(opt =>
            opt.value === item?.id || opt.value === item?.agente_id
          )
          return found?.label ?? JSON.stringify(item)
        }
        return String(item)
      }).join(", ")

      return (
        <div className="flex flex-col">
          <strong>{label}:</strong> {joined || "Não informado"}
        </div>
      )
    }

    if (selectFields.includes(campo)) {
      const opt = selectOptions[campo]?.find(o => o.value === value)
      return (
        <div className="flex flex-col">
          <strong>{label}:</strong> {opt?.label ?? "Não informado"}
        </div>
      )
    }

    // Fallback: renderField legado ou string
    return renderField
      ? renderField(campo, value as T[keyof T])
      : (
        <div>
          <strong>{label}:</strong> {String(value ?? "Não informado")}
        </div>
      )
  }

  // Grid responsivo
  const renderCampos = () => {
    if (!data) return null
    return campos.map((campo) => {
      const key = String(campo)
      const isFull = fieldsFullWidth?.includes(campo as keyof T)
      const isTwo = fieldsTwoColumns?.includes(campo as keyof T)
      const isThree = fieldsThreeColumns?.includes(campo as keyof T)
      const span = isFull ? "col-span-6" : isThree ? "col-span-2" : isTwo ? "col-span-3" : "col-span-6"
      return (
        <div key={key} className={`${span} w-full`}>
          {renderCampo(campo as keyof T, (data as any)[campo])}
        </div>
      )
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) { setModoEdicao(false); setFormData({}); setNovosValores({}); setMensagem(null) }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg bg-white rounded-xl shadow-lg p-0">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b px-6 py-4 rounded-t-xl">
          <DialogHeader className="p-0">
            {mensagem && (
              <div className={`py-2 px-3 rounded mb-2 text-sm ${mensagem.tipo === "sucesso" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {mensagem.texto}
              </div>
            )}
            <DialogTitle>Detalhes</DialogTitle>
            <DialogDescription>Informações do item selecionado.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-4">
          {loading && <p className="text-gray-500 py-4">Carregando...</p>}
          {error && <p className="text-red-600 py-4">{error}</p>}

          {data && !loading && !error && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-6 gap-4">
                {renderCampos()}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {!modoEdicao ? (
                  <Button
                    onClick={() => { if (!canEdit) return; setModoEdicao(true); setFormData({}) }}
                    disabled={!canEdit}
                    className={!canEdit ? "opacity-50 cursor-not-allowed" : undefined}
                    title={canEdit ? undefined : "Somente leitura para seu nível de acesso"}
                  >
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => { setModoEdicao(false); setFormData({}); setNovosValores({}) }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={handleAplicar}
                      disabled={!canEdit || loading}
                      title={!canEdit ? "Você não tem permissão para aplicar alterações" : undefined}
                    >
                      Aplicar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
