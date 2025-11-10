"use client"

import { useState, useMemo, useCallback, useEffect } from "react"



import type { VisibilityState } from "@tanstack/react-table"

import type { ReactNode } from "react"
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getPaginationRowModel, type ColumnDef,
} from "@tanstack/react-table"
import { parse, format, isValid } from "date-fns"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, EllipsisVertical, X } from "lucide-react"
import { useDeferredValue } from "react"

import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import { api } from "@/services/api"


export type RowData = {
  registro_de_campo_id?: number
  setor?: string
  complemento?: string
  logradouro?: string
  numero?: string
  tipo?: string
  status?: string
  data?: string
  atividade?: string[]
  numero_amostra?: string
 
}

export type BackendRow = {
  registro_de_campo_id?: number
  area_de_visita?: { setor?: string; logadouro?: string }
  imovel_complemento?: string
  imovel_numero?: string
  imovel_tipo?: string
  imovel_status?: string
   numero_da_amostra?: string
  ciclo?: { ano_de_criacao?: string }
  larvicidas?: { tipo?: string; forma?: string; quantidade?: number }[]
  adulticidas?: { tipo?: string; quantidade?: number }[]
   arquivos?: { arquivo_id: number; arquivo_nome: string }[]
  [k: string]: any
}


const STATUS_LABEL: Record<string, string> = {
  inspecionado: "Inspecionado", tratado: "Tratado", bloqueado: "Bloqueado",
  fechado: "Fechado", recusado: "Recusado", visitado: "Visitado", nao_inspecionado: "Não visitado"
}
export const FIELD_LABELS: Record<string, string> = {
  registro_de_campo_id: "ID do Registro", area_de_visita: "Área de Visita",
  imovel_numero: "Nº do Imóvel", imovel_complemento: "Complemento",
  numero_da_amostra: "Nº da amostra",
  quantiade_tubitos: "Qtd. de tubitos",
  observacao: "Observação",
  imovel_tipo: "Tipo de Imóvel", imovel_status: "Status",
  imovel_lado: "Lado da Rua", imovel_categoria_da_localidade: "Categoria da Localidade",
  formulario_tipo: "Tipo de Formulário", __label_depositos__: "Depósitos encontrados",
  a1: "A1", a2: "A2", b: "B", c: "C", d1: "D1", d2: "D2", e: "E",
  larvicidas: "Larvicidas aplicados", adulticidas: "Adulticidas aplicados",
  __label_atividades__: "Atividades realizadas", li: "LI", pe: "PE", t: "T", df: "DF", pve: "PVE",
  arquivos: "Arquivos do registro",
}



const BOOL_ATIVIDADES = ["li", "pe", "t", "df", "pve"] as const
const DEPOSITOS = ["a1", "a2", "b", "c", "d1", "d2", "e"] as const

export const fmtPt = (d?: string) => {
  if (!d) return undefined
  const p = parse(d, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date())
  if (isValid(p)) return format(p, "dd/MM/yyyy")
  const iso = new Date(d)
  return isValid(iso) ? format(iso, "dd/MM/yyyy") : undefined
}
export const safe = (v?: unknown) => (v == null || (typeof v === "string" && !v.trim()) ? "Não informado" : String(v))

export const normalize = (r: BackendRow): RowData => {
  const atividades = Object.entries(r).filter(([_, v]) => typeof v === "boolean" && v).map(([k]) => k.toUpperCase())
  return {
    registro_de_campo_id: r.registro_de_campo_id,
    setor: safe(r.area_de_visita?.setor),
    logradouro: safe(r.area_de_visita?.logadouro),
    numero: safe(r.imovel_numero),
    complemento: safe(r.imovel_complemento),
    numero_amostra: safe(r. numero_da_amostra),
    tipo: safe(r.imovel_tipo),
    status: safe(r.imovel_status),
    data: fmtPt(r.ciclo?.ano_de_criacao),
    atividade: atividades.length ? atividades : ["Nenhuma"],
  }
}

/* =============== Builders de payload (iguais aos seus) =============== */
const buildRegistroCampoFormDataStrict = (raw: Record<string, any>): FormData => {
  const fd = new FormData()
  const data = { ...raw }
  const toBool = (v: any) => ["true", "1"].includes(String(v ?? "").trim().toLowerCase()) || v === true
  const asInt = (v: any) => {
    const n = Number.parseInt(String(v ?? "").trim(), 10)
    return Number.isFinite(n) ? String(n) : "0"
  }
  const asId = (v: any) => (v && typeof v === "object" ? (v.area_de_visita_id ?? v.registro_de_campo_id ?? v.agente_id ?? v.id ?? v.value ?? null) : v)

  const REQUIRED = ["imovel_numero", "imovel_lado", "imovel_categoria_da_localidade", "imovel_tipo", "imovel_status", "area_de_visita_id", "a1", "a2", "b", "c", "d1", "d2", "e"] as const
  REQUIRED.forEach((k) => {
    if (k === "area_de_visita_id") {
      const areaId = data.area_de_visita_id ?? asId(data.area_de_visita) ?? data?.area_de_visita?.area_de_visita_id ?? data?.area_de_visita?.id
      if (areaId != null) fd.append("area_de_visita_id", asInt(areaId))
      return
    }
    if (["a1", "a2", "b", "c", "d1", "d2", "e"].includes(k as string)) fd.append(k as string, asInt(data[k]))
    else fd.append(k as string, String(data[k] ?? ""))
  })

  const OPTIONAL = ["imovel_complemento", "formulario_tipo", "li", "pe", "t", "df", "pve", "numero_da_amostra", "quantiade_tubitos", "observacao", "ciclo_id"] as const
  OPTIONAL.forEach((k) => {
    if (data[k] === undefined) return
    if (["li", "pe", "t", "df", "pve"].includes(k as string)) { if (toBool(data[k])) fd.append(k as string, "true"); return }
    if (k === "quantiade_tubitos" || k === "ciclo_id") { fd.append(k as string, asInt(data[k])); return }
    fd.append(k as string, String(data[k] ?? ""))
  })

  

  const isChangedArray = (arr: any) => Array.isArray(arr) && (arr as any).__changed === true
  if (isChangedArray(data.larvicidas)) {
    const arr = (data.larvicidas as any[]).map((x: any) => ({ tipo: String(x?.tipo ?? ""), ...(x?.forma ? { forma: String(x.forma) } : {}), quantidade: Number.isFinite(Number(x?.quantidade)) ? Number(x.quantidade) : 0 }))
    fd.append("larvicidas", JSON.stringify(arr))
  }
  if (isChangedArray(data.adulticidas)) {
    const arr = (data.adulticidas as any[]).map((x: any) => ({ tipo: String(x?.tipo ?? ""), quantidade: Number.isFinite(Number(x?.quantidade)) ? Number(x.quantidade) : 0 }))
    fd.append("adulticidas", JSON.stringify(arr))
  }
  if (isChangedArray(data.files)) (data.files as File[]).forEach((f) => fd.append("files", f))
  return fd
}

function RegistroCampoArquivoImg({
  arquivoId,
  nome,
}: {
  arquivoId: number
  nome: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let cancelado = false
    let objectUrl: string | null = null

    const fetchImg = async () => {
      try {
        const resp = await api.get(`/registro_de_campo/arquivo/${arquivoId}`, {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          },
        })

        objectUrl = URL.createObjectURL(resp.data)
        if (!cancelado) {
          setSrc(objectUrl)
        }
      } catch (e) {
        console.error("Erro ao carregar imagem de registro de campo:", e)
        if (!cancelado) setErro(true)
      }
    }

    fetchImg()

    return () => {
      cancelado = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [arquivoId])

  if (erro) {
    return (
      <div className="w-32 h-32 flex items-center justify-center text-[10px] text-red-600 border border-dashed border-red-300 rounded-md text-center px-1">
        Erro ao carregar
      </div>
    )
  }

  if (!src) {
    return (
      <div className="w-32 h-32 flex items-center justify-center text-[10px] text-gray-500 border border-dashed border-gray-300 rounded-md text-center px-1">
        Carregando...
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={nome}
      className="w-32 h-32 object-cover rounded-md border border-blue-100"
    />
  )
}


/* =============== Viewers / Editors (iguais aos seus) =============== */
const SectionLabel = (text: string) => (
  <div className="col-span-2 mt-1 mb-1 text-sm font-semibold text-gray-800 border-b border-gray-200 pb-0">{text}</div>
)
const viewersRegistroCampo = {
  "__label_depositos__": () => SectionLabel("Depósitos encontrados"),
  "__label_atividades__": () => SectionLabel("Atividades realizadas"),
  area_de_visita: ({ value }: any) => {
    const setor = value?.setor ?? "Não informado"
    const logradouro = value?.logadouro ?? "Não informado"
    return (
      <div>
        <strong>Setor / Logradouro:</strong>{" "}
        <span className="font-semibold">{setor}</span>{" "}
        <span className="text-gray-500">—</span>{" "}
        <span className="font-semibold">{logradouro}</span>
      </div>
    )
  },
  imovel_status: ({ value }: any) => <div><strong>Status:</strong> {STATUS_LABEL[String(value)] ?? String(value ?? "Não informado")}</div>,
  ...Object.fromEntries((BOOL_ATIVIDADES as readonly string[]).map(k => [
    k,
    ({ value }: any) => {
      const ativo = Boolean(value)
      const cls = ativo ? "bg-green-100 text-green-800 border border-green-700" : "bg-gray-100 text-gray-700 border border-gray-400"
      return (
        <div className="flex items-center gap-2">
          <strong>{k.toUpperCase()}:</strong>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{ativo ? "Sim" : "Não"}</span>
        </div>
      )
    },
  ])),
  ...Object.fromEntries((DEPOSITOS as readonly string[]).map((k) => [
    k,
    ({ value, data }: { value: any; data: any }) => {
      const v = value ?? data?.deposito?.[k] ?? 0
      const n = Number.isFinite(Number(v)) ? Number(v) : 0
      return <div><strong>{k.toUpperCase()}:</strong> <span className="font-semibold">{n}</span></div>
    },
  ])),
  larvicidas: ({ value }: any) => {
    const arr = Array.isArray(value) ? value : []
    if (!arr.length) return <div><strong>Larvicidas aplicados:</strong> Nenhum</div>
    return (
      <div>
        <strong>Larvicidas aplicados:</strong>
        <ul className="list-disc ml-5">
          {arr.map((v: any, i: number) => (
            <li key={i}>
              Tipo: <span className="font-semibold">{v.tipo ?? "Não informado"}</span>
              {v.forma ? <> | Forma: <span className="font-semibold">{v.forma}</span></> : null}
              {v.quantidade !== undefined ? <> | Quantidade: <span className="font-semibold">{v.quantidade}</span></> : null}
            </li>
          ))}
        </ul>
      </div>
    )
  },
  adulticidas: ({ value }: any) => {
    const arr = Array.isArray(value) ? value : []
    if (!arr.length) return <div><strong>Adulticidas aplicados:</strong> Nenhum</div>
    return (
      <div>
        <strong>Adulticidas aplicados:</strong>
        <ul className="list-disc ml-5">
          {arr.map((v: any, i: number) => (
            <li key={i}>
              Tipo: <span className="font-semibold">{v.tipo ?? "Não informado"}</span>
              {v.quantidade !== undefined ? <> | Quantidade: <span className="font-semibold">{v.quantidade}</span></> : null}
            </li>
          ))}
        </ul>
      </div>
    )
  },
 arquivos: ({ value }: any) => {
    const arr = Array.isArray(value) ? value : []

    if (!arr.length) {
      return (
        <div>
          <strong>Arquivos do registro:</strong>{" "}
          <span className="text-sm text-gray-500">Nenhum arquivo enviado</span>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <strong>Arquivos do registro:</strong>
        <div className="flex flex-wrap gap-4 mt-2">
          {arr.map((a: { arquivo_id: number; arquivo_nome: string }) => (
            <div
              key={a.arquivo_id}
              className="flex flex-col items-start gap-1"
            >
              <RegistroCampoArquivoImg
                arquivoId={a.arquivo_id}
                nome={a.arquivo_nome}
              />
            </div>
          ))}
        </div>
      </div>
    )
  },
}

const DepositoEditor = (label: string) =>
  ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
    <div className="flex flex-col w-full">
      <strong>{label}:</strong>
      <input
        type="number" min={0} step={1} value={Number(value ?? 0)}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 mt-1"
      />
    </div>
  )

function LarvicidasEditor({ value, onChange }: { value: any[]; onChange: (v: any) => void }) {
  const arr: any[] = Array.isArray(value) ? value : []
  const [draft, setDraft] = useState({ tipo: "", forma: "", quantidade: 0 })
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const tag = (next: any[]) => { Object.defineProperty(next, "__changed", { value: true, enumerable: false, configurable: true }); return next }
  const removeAt = async (i: number) => {
    const item = arr[i]; const id = item?.larvicida_id ?? item?.id
    if (id != null) {
      try { setDeletingIndex(i); await api.delete(`/larvicida/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` } }); onChange(tag(arr.filter((_, x) => x !== i))) }
      catch (err) { console.error(err); alert("Falha ao deletar larvicida no servidor.") }
      finally { setDeletingIndex(null) }
      return
    }
    onChange(tag(arr.filter((_, x) => x !== i)))
  }
  const add = () => {
    if (!draft.tipo.trim()) return
    onChange(tag([...arr, { tipo: draft.tipo.trim(), ...(draft.forma.trim() ? { forma: draft.forma.trim() } : {}), quantidade: Number(draft.quantidade || 0) }]))
    setDraft({ tipo: "", forma: "", quantidade: 0 })
  }
  return (
    <div className="flex flex-col w-full">
      <strong>Larvicidas aplicados:</strong>
      <ul className="mt-2 mb-3 space-y-1">
        {arr.map((it: any, i: number) => (
          <li key={i} className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded">
            <span className="text-sm">{it.tipo ?? "?"}{it.forma ? ` • ${it.forma}` : ""}{` • qtd: ${it.quantidade ?? 0}`}</span>
            <button type="button" onClick={() => removeAt(i)} disabled={deletingIndex === i}
              className={`text-xs ${deletingIndex === i ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:underline"}`}>
              {deletingIndex === i ? "removendo..." : "remover"}
            </button>
          </li>
        ))}
        {!arr.length && <li className="text-sm text-gray-500">Nenhum</li>}
      </ul>
      <div className="grid grid-cols-6 gap-2">
        <input className="col-span-3 border border-gray-300 rounded-md px-3 py-2" placeholder="Tipo" value={draft.tipo} onChange={(e) => setDraft((p) => ({ ...p, tipo: e.target.value }))} />
        <input className="col-span-2 border border-gray-300 rounded-md px-3 py-2" placeholder="Forma (opcional)" value={draft.forma} onChange={(e) => setDraft((p) => ({ ...p, forma: e.target.value }))} />
        <input className="col-span-1 border border-gray-300 rounded-md px-3 py-2" type="number" min={0} step={1} placeholder="Qtd." value={draft.quantidade} onChange={(e) => setDraft((p) => ({ ...p, quantidade: Math.max(0, Number(e.target.value)) }))} />
      </div>
      <div className="flex justify-end mt-2">
        <button type="button" onClick={add} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">Adicionar larvicida</button>
      </div>
    </div>
  )
}
function AdulticidasEditor({ value, onChange }: { value: any[]; onChange: (v: any) => void }) {
  const arr: any[] = Array.isArray(value) ? value : []
  const [draft, setDraft] = useState({ tipo: "", quantidade: 0 })
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const tag = (next: any[]) => { Object.defineProperty(next, "__changed", { value: true, enumerable: false, configurable: true }); return next }
  const removeAt = async (i: number) => {
    const item = arr[i]; const id = item?.adulticida_id ?? item?.id
    if (id != null) {
      try { setDeletingIndex(i); await api.delete(`/adulticida/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` } }); onChange(tag(arr.filter((_, x) => x !== i))) }
      catch (err) { console.error(err); alert("Falha ao deletar adulticida no servidor.") }
      finally { setDeletingIndex(null) }
      return
    }
    onChange(tag(arr.filter((_, x) => x !== i)))
  }
  const add = () => {
    if (!draft.tipo.trim()) return
    onChange(tag([...arr, { tipo: draft.tipo.trim(), quantidade: Number(draft.quantidade || 0) }]))
    setDraft({ tipo: "", quantidade: 0 })
  }
  return (
    <div className="flex flex-col w-full">
      <strong>Adulticidas aplicados:</strong>
      <ul className="mt-2 mb-3 space-y-1">
        {arr.map((it: any, i: number) => (
          <li key={i} className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded">
            <span className="text-sm">{it.tipo ?? "?"}{` • qtd: ${it.quantidade ?? 0}`}</span>
            <button type="button" onClick={() => removeAt(i)} disabled={deletingIndex === i}
              className={`text-xs ${deletingIndex === i ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:underline"}`}>
              {deletingIndex === i ? "removendo..." : "remover"}
            </button>
          </li>
        ))}
        {!arr.length && <li className="text-sm text-gray-500">Nenhum</li>}
      </ul>
      <div className="grid grid-cols-6 gap-2">
        <input className="col-span-4 border border-gray-300 rounded-md px-3 py-2" placeholder="Tipo" value={draft.tipo} onChange={(e) => setDraft((p) => ({ ...p, tipo: e.target.value }))} />
        <input className="col-span-2 border border-gray-300 rounded-md px-3 py-2" type="number" min={0} step={1} placeholder="Qtd." value={draft.quantidade} onChange={(e) => setDraft((p) => ({ ...p, quantidade: Math.max(0, Number(e.target.value)) }))} />
      </div>
      <div className="flex justify-end mt-2">
        <button type="button" onClick={add} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">Adicionar adulticida</button>
      </div>
    </div>
  )
}
const editorsRegistroCampo: Record<string, (args: any) => ReactNode> = {
  ...Object.fromEntries(DEPOSITOS.map(k => [k, ({ value, onChange }) => DepositoEditor(k.toUpperCase())({ value, onChange })])),
  larvicidas: ({ value, onChange }) => <LarvicidasEditor value={value} onChange={onChange} />,
  adulticidas: ({ value, onChange }) => <AdulticidasEditor value={value} onChange={onChange} />,
}

/* =============== Ações (menu da célula) =============== */
/* =============== Ações (menu da célula) =============== */
const AcoesCell = ({
  row,
  onView,
  canEdit,
  canDelete,
}: {
  row: { original: RowData }
  onView: (id: number | null) => void
  canEdit: boolean
  canDelete: boolean
}) => {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((p) => !p)

  return (
    <div className="flex items-center gap-2">
      {!open ? (
        <button className="p-1 hover:text-blue-900" onClick={toggle}>
          <EllipsisVertical className="w-4 h-4 text-blue-700" />
        </button>
      ) : (
        <>
          <button
            className={"p-1 hover:text-blue-500"}
            onClick={() => {
              toggle()
              onView(row.original.registro_de_campo_id ?? null)
            }}
            title={canEdit ? "Editar" : "Abrir em modo leitura"}
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* 🗑️ Excluir: só para agente */}
          {canDelete && (
            <button
              className="p-1 text-red-600 hover:text-red-900"
              onClick={() => {
                console.log("Excluir", row.original)
                toggle()
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* ❌ Fechar menu */}
          <button className="p-1 hover:text-gray-600" onClick={toggle}>
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}



/* =============== Variantes (qual conjunto mostrar) =============== */
type Variant = "semNaoInspecionados" | "apenasNaoInspecionados" | "todos"
const passaVariant = (status?: string, v: Variant = "semNaoInspecionados") => {
  const s = (status ?? "").toLowerCase()
  if (v === "semNaoInspecionados") return s !== "nao_inspecionado"
  if (v === "apenasNaoInspecionados") return s === "nao_inspecionado"
  return true
}

/* =============== Componente Reutilizável =============== */
export default function RegistroTabela({
  normalized,
  setRaw,
  variant = "semNaoInspecionados",

}: {
  normalized: RowData[]
  setRaw: React.Dispatch<React.SetStateAction<BackendRow[]>>
  variant?: Variant

}) {
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], status: [], atividade: [] })
  const [tmpFilters, setTmpFilters] = useState({ ...filters })
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [tmpDateRange, setTmpDateRange] = useState<[Date | null, Date | null]>([...dateRange])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  // const [totalRegistros, setTotalRegistros] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)


  const deferredGlobal = useDeferredValue(globalFilter)

  const accessLevelLS =
    typeof window !== "undefined" ? localStorage.getItem("auth_access_level") : null
  const isAgente = String(accessLevelLS ?? "").toLowerCase() === "agente"


  const visibilityByVariant: Record<Variant, VisibilityState> = useMemo(() => ({
    semNaoInspecionados: {

    },
    apenasNaoInspecionados: {
      atividade: false,   
      complemento: false, 
    },
    todos: {}
  }), [])

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => visibilityByVariant[variant] ?? {}
  )

  useEffect(() => {
    setColumnVisibility(visibilityByVariant[variant] ?? {})
  }, [variant, visibilityByVariant])


  const base = useMemo(() => normalized.filter(r => passaVariant(r.status, variant)), [normalized, variant])

  const filtered: RowData[] = useMemo(() => {
    const txt = (deferredGlobal ?? "").toLowerCase()
    const byGlobal = txt ? base.filter((r) => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(txt))) : base

    let byFields = byGlobal
    for (const [k, vals] of Object.entries(filters)) {
      if (!vals.length) continue
      byFields = byFields.filter((r: any) => Array.isArray(r[k]) ? r[k].some((x: any) => vals.includes(String(x))) : vals.includes(String(r[k])))
    }

    if (dateRange[0] && dateRange[1]) {
      byFields = byFields.filter((r) => {
        if (!r.data) return false
        const [d, m, y] = r.data.split("/").map(Number)
        const dt = new Date(y, m - 1, d)
        return isValid(dt) && dt >= dateRange[0]! && dt <= dateRange[1]!
      })
    }

    return byFields
  }, [base, deferredGlobal, filters, dateRange])

  const paged: RowData[] = useMemo(() => {
    // setTotalRegistros(filtered.length); 
    setTotalRows(filtered.length)
    const start = page.pageIndex * page.pageSize
    return filtered.slice(start, start + page.pageSize)
  }, [filtered, page.pageIndex, page.pageSize])

  const uniqValues = useCallback(
    (k: keyof RowData) =>
      Array.from(new Set(filtered.flatMap((r) => (Array.isArray(r[k]) ? r[k]! : r[k] ? [r[k]!] : [])))).map(String),
    [filtered]
  )

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
   {accessorKey: "setor",
    header: "Identificador do setor",
    cell: ({ row, getValue }) => (
      <span
        className="font-semibold text-blue-800 cursor-pointer hover:underline"
        onClick={() => {
          setSelectedId(row.original.registro_de_campo_id ?? null)
          setIsModalOpen(true)
        }}
      >
        {getValue() as string}
      </span>
    ),
  },
    { accessorKey: "complemento", header: "Complemento" },
    { accessorKey: "logradouro", header: "Logradouro" },
    { accessorKey: "numero", header: "N°" },
    { accessorKey: "tipo", header: "Tipo de Imóvel" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const raw = getValue() as string
        const s = STATUS_LABEL[raw] ?? raw
        const cls =
          s === "Inspecionado" ? "bg-green-100 text-green-700 border border-green-700" :
            s === "Visitado" ? "bg-lime-100 text-lime-800 border border-lime-800" :
              s === "Bloqueado" ? "bg-blue-100 text-blue-800 border border-blue-800" :
                s === "Fechado" ? "bg-yellow-100 text-yellow-700 border border-yellow-700" :
                  s === "Recusado" || s === "Não visitado" ? "bg-red-100 text-red-700 border border-red-700" :
                    "bg-gray-100 text-gray-700 border border-gray-700"
        return <span className={`px-2 py-1 rounded-md text-xs font-semibold ${cls}`}>{s}</span>
      }
    },
    { accessorKey: "atividade", header: "Atividades Realizadas" },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => <AcoesCell
        row={row}
        onView={(id) => { setSelectedId(id); setIsModalOpen(true) }}
        canEdit={isAgente}
        canDelete={isAgente}  
      />,
      size: 60
    },
  ], [])

  const table = useReactTable({
    data: paged,
    columns,
    pageCount: Math.max(1, Math.ceil(totalRows / page.pageSize)),
    state: { globalFilter, rowSelection, pagination: { pageIndex: page.pageIndex, pageSize: page.pageSize }, columnVisibility, },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const s = typeof updater === "function" ? updater({ pageIndex: page.pageIndex, pageSize: page.pageSize }) : updater
      setPage({ pageIndex: s.pageIndex, pageSize: s.pageSize })
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true,
  })



  const filtros: FiltroConfig<RowData>[] = [
    { key: "data", label: "Intervalo de datas", type: "date" },
    { key: "setor", label: "Identificador do setor" },
    { key: "tipo", label: "Tipo de imóvel" },
    { key: "status", label: "Status" },
    { key: "atividade", label: "Atividade Realizada" },
  ]

  const handleSavedFromModal = (updated: any) => {
    if (!updated?.registro_de_campo_id) return
    setRaw(prev =>
      prev.map((r) => {
        if (r.registro_de_campo_id !== updated.registro_de_campo_id) return r
        return {
          ...r,
          imovel_numero: updated.imovel_numero ?? r.imovel_numero,
          imovel_complemento: updated.imovel_complemento ?? r.imovel_complemento,
          imovel_tipo: updated.imovel_tipo ?? r.imovel_tipo,
          imovel_status: updated.imovel_status ?? r.imovel_status,
          numero_da_amostra: updated.numero_da_amostra ?? r.numero_da_amostra,
        quantiade_tubitos: updated.quantiade_tubitos ?? r.quantiade_tubitos,
        observacao: updated.observacao ?? r.observacao,
          li: typeof updated.li === "boolean" ? updated.li : r.li,
          pe: typeof updated.pe === "boolean" ? updated.pe : r.pe,
          t: typeof updated.t === "boolean" ? updated.t : r.t,
          df: typeof updated.df === "boolean" ? updated.df : r.df,
          pve: typeof updated.pve === "boolean" ? updated.pve : r.pve,
          larvicidas: Array.isArray(updated.larvicidas) ? updated.larvicidas : r.larvicidas,
          adulticidas: Array.isArray(updated.adulticidas) ? updated.adulticidas : r.adulticidas,
          a1: updated.a1 ?? r.a1, a2: updated.a2 ?? r.a2, b: updated.b ?? r.b, c: updated.c ?? r.c,
          d1: updated.d1 ?? r.d1, d2: updated.d2 ?? r.d2, e: updated.e ?? r.e,
        } as BackendRow
      })
    )
  }

  const modalCampos: (keyof BackendRow | string)[] = [
    "registro_de_campo_id", "area_de_visita", "imovel_numero", "imovel_complemento", "imovel_tipo", "imovel_status",
    "imovel_lado", "imovel_categoria_da_localidade", "formulario_tipo",
     "numero_da_amostra", "quantiade_tubitos",
    "__label_depositos__", ...DEPOSITOS, "larvicidas", "adulticidas",
    "arquivos",
    "__label_atividades__", ...BOOL_ATIVIDADES,
    "observacao",
  ]


  return (
    <Card className="space-y-4 min-w-[180px] p-2 lg:p-4 xl:p-6 border-none  shadow-none">
      <div className="text-fluid-large font-bold text-gray-900 mb-2">
      </div>

  
        <>
          <TabelaFiltro<RowData>
            filtros={filtros}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            tempFilters={tmpFilters}
            setTempFilters={setTmpFilters}
            tempDateRange={tmpDateRange}
            setTempDateRange={setTmpDateRange}
            setFilters={setFilters}
            setAppliedDateRange={setDateRange}
            uniqueValues={uniqValues}
            selectedCount={0}
            allSelected={false}
            toggleAllSelected={() => { }}
          />

          <Tabela table={table} />
          <TabelaPaginacao<RowData> table={table} />

          <ModalDetalhes<BackendRow>
            id={selectedId}
            endpoint="/registro_de_campo"
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            campos={modalCampos}
            editableFields={["imovel_complemento", "imovel_status", ...DEPOSITOS, "larvicidas", "adulticidas", ...BOOL_ATIVIDADES]}
            selectFields={["imovel_status"]}
            selectOptions={{ imovel_status: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })) }}
            fieldsTwoColumns={[
              "registro_de_campo_id", "imovel_numero", "imovel_complemento", "imovel_tipo", "imovel_status",
              "imovel_lado", "imovel_categoria_da_localidade", "formulario_tipo",  "numero_da_amostra",
  "quantiade_tubitos",
            ]}
            fieldsThreeColumns={[...DEPOSITOS, ...BOOL_ATIVIDADES]}
            fieldsFullWidth={["area_de_visita", "larvicidas", "adulticidas",  "observacao"]}
            fieldLabels={FIELD_LABELS}
            sendAsJson={false}
            onBeforeSubmit={buildRegistroCampoFormDataStrict}
            arrayEditingStrategy="none"
            customViewers={viewersRegistroCampo as any}
            customEditors={editorsRegistroCampo as any}
            onSaved={handleSavedFromModal}
            canEdit={isAgente}
          />

        </>
      
    </Card>
  )
}
