"use client"

import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { api } from "@/services/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

  fieldLabels?: Partial<Record<keyof T, string>>
  renderField?: (field: keyof T, value: T[keyof T]) => React.ReactNode
  nomeDoCampo?: string

  editableFields?: (keyof T)[]
  selectFields?: (keyof T)[]
  selectOptions?: Partial<Record<keyof T, Array<{ value: any; label: string }>>>

  fieldsTwoColumns?: (keyof T)[]
  fieldsThreeColumns?: (keyof T)[]
  fieldsFullWidth?: (keyof T)[]

  sendAsJson?: boolean
  onBeforeSubmit?: (payload: any) => any | FormData

  customEditors?: Partial<Record<string, (args: EditorArgs<T>) => React.ReactNode>>
  customViewers?: Partial<Record<string, (args: ViewerArgs<T>) => React.ReactNode>>

  arrayEditingStrategy?: "none" | "primitive-tags"
}

/* ========= Helpers globais ========= */

const DEPOSITOS_KEYS = ["a1", "a2", "b", "c", "d1", "d2", "e"] as const

const flattenDeposito = <T extends Record<string, any>>(obj: T | null): T | null => {
  if (!obj || typeof obj !== "object") return obj
  const out: any = { ...obj }
  const dep = (obj as any).deposito
  if (dep && typeof dep === "object") for (const k of DEPOSITOS_KEYS) if (k in dep) out[k] = dep[k]
  return out
}

// const isFormData = (x: any): x is FormData =>
//   typeof FormData !== "undefined" && x instanceof FormData

// const dumpFormData = (fd: FormData) => {
//   const rows: Array<{ key: string; value: string }> = []
//   for (const [k, v] of fd.entries())
//     rows.push(
//       v instanceof File
//         ? { key: k, value: `[File] name=${v.name} size=${v.size} type=${v.type}` }
//         : { key: k, value: String(v) }
//     )
// }



const dumpAxiosError = (e: any) => {

  const server = e?.response?.data
  if (server?.errors && typeof server.errors === "object") {
    const flat = Object.entries(server.errors).map(
      ([k, v]: any) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
    )
    console.log("fieldErrors:", flat.join(" | "))
  }

}

const isPrimitiveArray = (arr: any[]) =>
  arr.every(v => ["string", "number", "boolean"].includes(typeof v))

const buildUnifiedPayload = <T extends Record<string, any>>(
  base: Partial<T>,
  sendAsJson: boolean,
  onBeforeSubmit?: (payload: any) => any | FormData
) => {
  const prepared = typeof onBeforeSubmit === "function" ? onBeforeSubmit(base) : base
  if (sendAsJson || prepared instanceof FormData) return prepared
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
const API_BASE = (api.defaults.baseURL || "").replace(/\/$/, "")


/* ========== Componente ========== */

export default function ModalDetalhes<T extends Record<string, any>>({
  id,
  endpoint,
  campos,
  open,
  onOpenChange,
  fieldLabels = {},
  renderField,
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
  const [novosValores, setNovosValores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id || !open) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await api.get(`${endpoint}/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` },
        })
        setData(flattenDeposito(res.data))
      } catch (e) {
        setError("Erro ao carregar dados")
        setData(null)
        toast.error("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    })()
  }, [id, endpoint, open])

  const handleChange = (field: keyof T, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleAplicar = async () => {
    if (!id || !data || !canEdit) return
    setLoading(true)
    setError(null)
    try {
      const payloadObj: Partial<T> = { ...data }
      editableFields.forEach(field => {
        if (formData[field] !== undefined) payloadObj[field] = formData[field] as T[keyof T]
      })
      const unifiedPayload = buildUnifiedPayload(payloadObj, sendAsJson, onBeforeSubmit)

      // isFormData(unifiedPayload) ? dumpFormData(unifiedPayload) : dumpJson(unifiedPayload)

      const resp = await api.put(`${endpoint}/${id}`, unifiedPayload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          ...(sendAsJson ? { "Content-Type": "application/json" } : {}),
        },
      })

      const serverData = resp?.data?.data ?? null
      const merged = serverData
        ? flattenDeposito(serverData)
        : flattenDeposito({ ...(data as any), ...(payloadObj as any) })

      if (merged) {
  setData(prev => {
    const artigoId =
      (merged as any)?.artigo_id ??
      (merged as any)?.id ??
      (prev as any)?.artigo_id

    if (artigoId) {
      return {
        ...merged,
        [nomeDoCampo!]: `${API_BASE}/artigo/img/${artigoId}?t=${Date.now()}`
      }
    }
    return merged as T
  })
}

      toast.success("Atualizado com sucesso!")
      setModoEdicao(false)
      setFormData({})
      onSaved?.(merged ?? payloadObj)
    } catch (e: any) {
      dumpAxiosError(e)
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Falha ao aplicar alterações."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const labelOf = (campo: keyof T) => fieldLabels[campo] ?? String(campo)

   const renderCampo = (campo: keyof T, valor: T[keyof T]) => {
    const value = formData[campo] ?? valor
    const isEditable = modoEdicao && editableFields.includes(campo)
    const label = labelOf(campo)
    const key = String(campo)

    // ===== Campo especial de imagem (para artigos) =====
    if (campo === (nomeDoCampo as keyof T)) {
     const isFile = typeof File !== "undefined" && (value as any) instanceof File


      // Se NÃO for arquivo novo, pegamos a imagem atual pelo artigo_id
      const artigoId =
        (data as any)?.artigo_id ??
        (data as any)?.id ??
        (typeof value === "number" ? value : undefined)

      const imageSrc =
        !isFile && artigoId != null ? `${API_BASE}/artigo/img/${artigoId}` : undefined

      return (
        <div className="flex flex-col gap-2 text-blue-dark">
          <strong className="text-sm">{label}:</strong>

          {/* Imagem atual só aparece se NÃO tiver um arquivo novo selecionado */}
          {!isFile && imageSrc && (
            <img
              src={imageSrc}
              alt="Imagem do artigo"
              className="w-40 h-40 object-cover rounded-md border border-blue-100"
            />
          )}

          {/* Quando um novo arquivo é selecionado, mostra só o nome dele */}
          {isFile && (
            <span className="text-xs mt-1">
              Nova imagem selecionada: {(value as File).name}
            </span>
          )}

          {/* Nada de imprimir String(valor) aqui, pra não aparecer a URL */}
          {/* <span className="text-sm">{String(valor)}</span>  <-- REMOVIDO */}

          {modoEdicao && (
            <label className="cursor-pointer text-blue-dark underline text-xs mt-1">
              Selecionar nova imagem
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0]

                    // joga o arquivo no formData (value passa a ser File)
                    handleChange(campo, file)

                    // Se ainda quiser manter um preview local (sem mostrar URL do backend)
                    const previewUrl = URL.createObjectURL(file)
                    setData(prev =>
                      prev
                        ? ({
                            ...prev,
                            [campo]: previewUrl, // não é exibido enquanto value for File
                          } as T)
                        : prev
                    )
                  }
                }}
              />
            </label>
          )}
        </div>
      )
    }

    if (isEditable && customEditors[key])
      return (
        <div className="text-blue-dark text-sm">
          {customEditors[key]!({
            field: campo,
            value,
            label,
            onChange: next => handleChange(campo, next),
            data,
            formData,
          })}
        </div>
      )

    if (!isEditable && customViewers[key])
      return (
        <div className="text-blue-dark text-sm">
          {customViewers[key]!({ field: campo, value, label, data })}
        </div>
      )

    if (isEditable) {
      // boolean
      if (typeof value === "boolean")
        return (
          <label className="flex items-center gap-2 text-blue-dark text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={Boolean(value)}
              onChange={e => handleChange(campo, e.target.checked as any)}
            />
            <span className="select-none">{label}</span>
          </label>
        )

      // select
      if (selectFields.includes(campo))
        return (
          <div className="flex flex-col w-full text-blue-dark text-sm">
            <strong className="mb-1">{label}:</strong>
            <select
              value={value ?? ""}
              onChange={e => handleChange(campo, e.target.value)}
              className="bg-secondary border-none text-blue-dark rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-dark"
            >
              <option value="">Selecione...</option>
              {selectOptions[campo]?.map((opt, i) => (
                <option key={i} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )

      // array com "tags"
      if (Array.isArray(value) && arrayEditingStrategy === "primitive-tags" && isPrimitiveArray(value)) {
        const novoValor = novosValores[key] ?? ""
        const baseType = typeof (value[0] ?? "")
        const castFromString = (str: string) =>
          baseType === "number" ? Number(str) : baseType === "boolean" ? str === "true" : str

        const add = () => {
          if (!novoValor.trim()) return
          handleChange(campo, [...(value as any[]), castFromString(novoValor)])
          setNovosValores(p => ({ ...p, [key]: "" }))
        }

        const removeAt = (i: number) =>
          handleChange(campo, (value as any[]).filter((_, x) => x !== i))

        return (
          <div className="flex flex-col w-full mb-2 text-blue-dark text-sm">
            <strong>{label}:</strong>
            <div className="flex flex-wrap gap-2 mt-1">
              {(value as any[]).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center bg-secondary text-blue-dark rounded-full px-3 py-1 text-xs border border-blue-100"
                >
                  <span>{String(item)}</span>
                  <button
                    onClick={() => removeAt(i)}
                    className="ml-2 text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!value.length && <span className="text-xs text-gray-500">Nenhum</span>}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Novo item"
                className="bg-secondary border-none text-blue-dark rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-dark text-sm"
                value={novoValor}
                onChange={e => setNovosValores(p => ({ ...p, [key]: e.target.value }))}
              />
              <button
                onClick={add}
                className="bg-blue-dark text-white px-3 py-2 rounded-md text-xs hover:bg-blue"
              >
                Inserir
              </button>
            </div>
          </div>
        )
      }

      // texto padrão
      return (
        <div className="flex flex-col w-full text-blue-dark text-sm">
          <strong>{label}:</strong>
          <input
            type="text"
            value={String(value ?? "")}
            onChange={e => handleChange(campo, e.target.value)}
            className="bg-secondary border-none text-blue-dark rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-dark mt-1"
          />
        </div>
      )
    }

    // modo visualização
    if (Array.isArray(value)) {
      const joined = (value as any[])
        .map(item => {
          if (typeof item === "object" && item !== null) {
            const matchedKey = Object.keys(selectOptions).find(k =>
              selectOptions[k as keyof typeof selectOptions]?.some(
                opt => opt.value === (item as any)?.id || opt.value === (item as any)?.agente_id
              )
            )
            if (!matchedKey) return JSON.stringify(item)
            const found = selectOptions[matchedKey as keyof typeof selectOptions]?.find(
              opt =>
                opt.value === (item as any)?.id || opt.value === (item as any)?.agente_id
            )
            return found?.label ?? JSON.stringify(item)
          }
          return String(item)
        })
        .join(", ")

      return (
        <div className="flex flex-col text-blue-dark text-sm">
          <strong>{label}:</strong> {joined || "Não informado"}
        </div>
      )
    }

    if (selectFields.includes(campo)) {
      const opt = selectOptions[campo]?.find(o => o.value === value)
      return (
        <div className="flex flex-col text-blue-dark text-sm">
          <strong>{label}:</strong> {opt?.label ?? "Não informado"}
        </div>
      )
    }

    if (renderField) {
      return (
        <div className="text-blue-dark text-sm">
          {renderField(campo, value as T[keyof T])}
        </div>
      )
    }

    return (
      <div className="text-blue-dark text-sm">
        <strong>{label}:</strong> {String(value ?? "Não informado")}
      </div>
    )
  }

  const renderCampos = () => {
    if (!data) return null
    return campos.map(campo => {
      const key = String(campo)
      const asKey = campo as keyof T
      const isFull = fieldsFullWidth?.includes(asKey)
      const isTwo = fieldsTwoColumns?.includes(asKey)
      const isThree = fieldsThreeColumns?.includes(asKey)
      const span = isFull ? "col-span-6" : isThree ? "col-span-2" : isTwo ? "col-span-3" : "col-span-6"
      return (
        <div key={key} className={`${span} w-full`}>
          {renderCampo(asKey, (data as any)[campo])}
        </div>
      )
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          setModoEdicao(false)
          setFormData({})
          setNovosValores({})
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="bg-white border-none sm:max-w-[660px] p-0 rounded-2xl shadow-lg overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 rounded-t-2xl">
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-lg font-semibold text-blue-dark">
              Detalhes
            </DialogTitle>
            <DialogDescription className="text-sm text-blue-dark">
              Informações do item selecionado.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-4 bg-white text-blue-dark">
          {loading && <p className="py-4 text-sm">Carregando...</p>}
          {error && <p className="text-red-600 py-4 text-sm">{error}</p>}

          {data && !loading && !error && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-6 gap-4">{renderCampos()}</div>

              <div className="flex justify-end gap-2 pt-3 border-t border-blue-dark/20 mt-2">
                {!modoEdicao ? (
                  <Button
                    onClick={() => {
                      if (!canEdit) return
                      setModoEdicao(true)
                      setFormData({})
                    }}
                    disabled={!canEdit}
                    className={`bg-blue-dark text-white hover:bg-blue ${
                      !canEdit ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title={
                      canEdit ? undefined : "Somente leitura para seu nível de acesso"
                    }
                  >
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModoEdicao(false)
                        setFormData({})
                        setNovosValores({})
                      }}
                      className="border-none bg-secondary text-blue-dark hover:bg-secondary/80"
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={handleAplicar}
                      disabled={!canEdit || loading}
                      title={
                        !canEdit
                          ? "Você não tem permissão para aplicar alterações"
                          : undefined
                      }
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
