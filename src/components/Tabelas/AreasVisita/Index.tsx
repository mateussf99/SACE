"use client"

import { useState, useMemo, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from "@tanstack/react-table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, X, EllipsisVertical } from "lucide-react"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import { api } from "@/services/api"
import { toast } from "react-toastify"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export type RowData = {
  area_de_visita_id?: number
  setor?: string
  numero_quarteirao?: number
  municipio?: string
  logradouro?: string
  agente?: string
  bairro?: string
  estado?: string
  status?: string
}

export interface BackendRow extends RowData {
  cep?: string
  logadouro?: string
  status?: string
  numero_quarteirao?: number
  agentes?: { agente_id?: number; nome?: string; situacao_atual?: boolean }[]
}

type AreasTabelaProps = {
  /** lista bruta vinda de outro endpoint (ex: areas_de_visitas de /area_de_visita_denuncias/{agente_id}) */
  initialDataRaw?: BackendRow[]
  /** se true, NÃO faz GET /area_de_visita – usa apenas initialDataRaw (ou fica vazia) */
  disableOwnFetch?: boolean
}

/* ===== Helpers gerais ===== */
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

const fieldLabels: Record<string, string> = {
  setor: "Identificador do Setor",
  estado: "Estado",
  municipio: "Município",
  status: "Status",
  cep: "CEP",
  bairro: "Bairro",
  numero_quarteirao: "Número do Quarteirão",
  logadouro: "Logradouro",
  logradouro: "Logradouro",
  agentes: "Agente Responsável",
}
const STATUS_LABEL: Record<string, string> = {
  "Não visitado": "Não visitado",
  "Em andamento": "Em andamento",
  "Visitado": "Visitado",
}


const normalize = (r: BackendRow): RowData => {
  const safe = (v?: unknown) => (typeof v === "string" && v.trim() ? v : "Não informado")
  return {
    area_de_visita_id: r.area_de_visita_id,
    setor: safe(r.setor),
    numero_quarteirao: r.numero_quarteirao,
    estado: safe(r.estado),
    municipio: safe(r.municipio),
    logradouro: safe(r.logradouro ?? r.logadouro),
    agente: r.agentes?.length ? r.agentes.map(a => a.nome).join(", ") : "Não informado",
    bairro: safe(r.bairro),
    status: r.status && STATUS_LABEL[r.status] ? r.status : "Não visitado",

  }
}

const deletarAreas = async (ids: number[]) => {
  if (!ids.length) return
  try {
    const { data } = await api.delete("/area_de_visita", { data: { ids } })
    return data
  } catch (e: any) {
    const msg: Record<number, string> = {
      400: "Requisição inválida. IDs não enviados corretamente.",
      401: "Não autenticado.",
      403: "Acesso proibido. Apenas supervisores podem deletar.",
      404: "Uma ou mais áreas de visita não foram encontradas.",
    }
    toast.error(msg[e?.response?.status] || "Erro interno do servidor.")
    throw e
  }
}

export default function Index({
  initialDataRaw,
  disableOwnFetch = false,
}: AreasTabelaProps) {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], bairro: [] })
  const [tempFilters, setTempFilters] = useState(filters)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [agentesOptions, setAgentesOptions] = useState<{ label: string; value: number }[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { })

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const accessLevelLS = typeof window !== "undefined" ? localStorage.getItem("auth_access_level") : null

  const payload = useMemo(
    () => decodeJwtPayload<{ agente_id?: number | string; nivel_de_acesso?: string }>(token),
    [token],
  )

  const agenteId = useMemo(() => coerceNum(payload?.agente_id), [payload])
  const accessLevel = useMemo(() => {
    const raw = (payload?.nivel_de_acesso ?? accessLevelLS) as string | undefined
    return raw ? raw.toString().trim().toLowerCase() : null
  }, [payload, accessLevelLS])

  const mustFilterByAgente = accessLevel === "agente" && agenteId != null
  const isAgente = accessLevel === "agente"
  const isSupervisor = accessLevel === "supervisor"
  const canEdit = !!isSupervisor
  const canDelete = !!isSupervisor

  const confirmDelete = (action: () => void, description = "Deseja realmente excluir?") => {
    setConfirmAction(() => action)
    setConfirmDescription(description)
    setConfirmOpen(true)
  }

  const uniqueValues = (key: keyof RowData) =>
    key === "agente"
      ? Array.from(new Set(data.flatMap(r => r.agente?.split(", ").map(a => a.trim()) ?? [])))
      : Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  useEffect(() => {
    api
      .get("/usuarios", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` },
      })
      .then(res =>
        setAgentesOptions(
          res.data.agentes.map((a: any) => ({ label: a.nome_completo, value: a.agente_id })),
        ),
      )
     // .catch(err => console.error("Erro ao buscar agentes:", err))
  }, [])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setError(null)
      try {
        let allRaw: BackendRow[] = []

        if (initialDataRaw && initialDataRaw.length) {

          allRaw = initialDataRaw
        } else {
          if (disableOwnFetch) {

            setData([])
            setTotalRows(0)
            return
          }

          const { data: res } = await api.get("/area_de_visita", {
            headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` },
          })

          allRaw = Array.isArray(res) ? (res as BackendRow[]) : []

          if (mustFilterByAgente) {
            allRaw = allRaw.filter(
              item =>
                Array.isArray(item.agentes) &&
                item.agentes.some(a => coerceNum(a?.agente_id) === agenteId),
            )
          }
        }

        let all: RowData[] = allRaw.map(normalize)

        if (globalFilter) {
          const s = globalFilter.toLowerCase()
          all = all.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(s)))
        }

        Object.entries(filters).forEach(([k, vals]) => {
          if (!vals.length) return
          all = all.filter(r => {
            const val = r[k as keyof RowData]
            return k === "agente" && typeof val === "string"
              ? val.split(", ").some(name => vals.includes(name))
              : vals.includes(String(val))
          })
        })

        setTotalRows(all.length)
        const start = page.pageIndex * page.pageSize
        setData(all.slice(start, start + page.pageSize))
      } catch {
        setError("Erro ao carregar dados")
        setData([])
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [
    page,
    filters,
    globalFilter,
    token,
    accessLevel,
    mustFilterByAgente,
    agenteId,
    initialDataRaw,
    disableOwnFetch,
  ])


  const AcoesCell = ({
    row,
    canEdit,
    canDelete,
    onOpen,
  }: {
    row: { original: RowData }
    canEdit: boolean
    canDelete: boolean
    onOpen: (id: number | null) => void
  }) => {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen(p => !p)
    const ver = () => {
      toggle()
      onOpen(row.original.area_de_visita_id ?? null)
    }

    return (
      <div className="flex items-center gap-2">
        {!open ? (
          <button className="p-1 hover:text-blue-900" onClick={toggle}>
            <EllipsisVertical className="w-4 h-4 text-blue-700" />
          </button>
        ) : (
          <>
            <button
              className="p-1 hover:text-green-700"
              onClick={canEdit ? ver : () => ver()}
              title={canEdit ? "Editar" : "Somente leitura"}
            >
              <Edit className="w-4 h-4" />
            </button>

            {canDelete && (
              <button
                className="p-1 text-red-600 hover:text-red-900"
                onClick={() =>
                  confirmDelete(
                    async () => {
                      try {
                        const resp = await deletarAreas([
                          row.original.area_de_visita_id as number,
                        ])
                          toast.success(
              resp?.message || "Área de visita excluída com sucesso."
            )
                        setData(p =>
                          p.filter(
                            d =>
                              d.area_de_visita_id !== row.original.area_de_visita_id,
                          ),
                        )
                        toggle()
                      } catch (e) {
                        console.error(e)
                      }
                    },
                    "Deseja realmente excluir esta área?",
                  )
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button className="p-1 hover:text-gray-600" onClick={toggle}>
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    const base: ColumnDef<RowData>[] = [
      {
        accessorKey: "setor",
        header: "Identificador do setor",
        cell: ({ row, getValue }) => (
          <span
            className="font-semibold text-blue-800 cursor-pointer hover:underline"
            onClick={() => {
              setSelectedId(row.original.area_de_visita_id ?? null)
              setIsModalOpen(true)
            }}
          >
            {getValue() as string}
          </span>
        ),
      },

      { accessorKey: "bairro", header: "Bairro" },
      {
        accessorKey: "logradouro",
        header: "Logradouro",
        cell: ({ getValue }) => (
          <span className="font-semibold text-gray-700">{getValue() as string}</span>
        ),
      },
      { accessorKey: "numero_quarteirao", header: "N° Quarteirão" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const valor = getValue() as string
          const cores: Record<string, string> = {
            "Visitado": "bg-green-100 text-green-800",
            "Em andamento": "bg-yellow-100 text-yellow-800",
            "Não visitado": "bg-gray-100 text-gray-700",
          }
          const cor = cores[valor] || "bg-gray-100 text-gray-700"
          return (
            <span className={`px-2 py-1 text-xs font-semibold rounded ${cor}`}>
              {valor}
            </span>
          )
        },
      },
      ...(!isAgente
        ? ([
          {
            accessorKey: "agente",
            header: "Agente responsável",
          } as ColumnDef<RowData>,
        ] as ColumnDef<RowData>[])
        : []),

      {
        id: "acoes",
        header: "Ações",
        cell: ({ row }) => (
          <AcoesCell
            row={row}
            canEdit={canEdit}
            canDelete={canDelete}
            onOpen={id => {
              setSelectedId(id)
              setIsModalOpen(true)
            }}
          />
        ),
        size: 60,
      },
    ]

    if (!isAgente) {
      base.unshift({
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-2 border-blue-600"
          />
        ),
        size: 40,
      } as ColumnDef<RowData>)
    }

    return base
  }, [canEdit, canDelete, isAgente])

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRows / page.pageSize),
    state: { globalFilter, rowSelection, pagination: page },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: up => setPage(typeof up === "function" ? up(page) : up),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true,
  })

  const renderBar = () => {
    if (!canDelete) return null
    const selectedCount = table.getSelectedRowModel().rows.length
    const allSelected = table.getIsAllPageRowsSelected()
    if (!selectedCount) return null

    return (
      <div className="flex items-center justify-between p-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-2 border-blue-600"
          />
          <span>Selecionar todos</span>
          <button
            className="flex items-center gap-1 p-1 text-red-600 hover:text-red-900"
            onClick={() => {
              const ids = table
                .getSelectedRowModel()
                .rows.map(r => r.original.area_de_visita_id!)
                .filter(Boolean)
          if (!ids.length) {

      return
    }
              confirmDelete(
                async () => {
                  try {
                    const resp = await deletarAreas(ids)
                      toast.success(
            resp?.message || "Áreas de visita excluídas com sucesso."
          )
                    setData(p => p.filter(d => !ids.includes(d.area_de_visita_id!)))
                    table.toggleAllPageRowsSelected(false)
                  } catch (e) {
                    console.error(e)
                  }
                },
                `Deseja realmente excluir as áreas selecionadas?`,
              )
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>
        </div>
        <button
          className="p-1 hover:text-gray-700"
          onClick={() => table.toggleAllPageRowsSelected(false)}
        >
          <X className="w-6 h-6 text-gray-800 hover:text-black" />
        </button>
      </div>
    )
  }

  const getAgenteLabel = (id: number | undefined) => {
    if (!id) return "Não informado"
    const found = agentesOptions.find(a => a.value === id)
    return found ? found.label : id
  }

 const renderField = (f: keyof BackendRow, v: any) => {
  if (f === "agentes") {
    const ids = Array.isArray(v) ? v : [v].filter(Boolean)
    const nomes = ids.map((id: number) => getAgenteLabel(id))
    return (
      <span>
        {nomes.length ? nomes.join(", ") : "Não informado"}
      </span>
    )
  }

  return (
    <span>
      {v == null ? "Não informado" : Array.isArray(v) ? v.join(", ") : String(v)}
    </span>
  )
}


  const handleSubmitCustom = (payload: any) => {
    if (payload.agentes) {
      payload.agentes = payload.agentes
        .map((item: any) => {
          if (item.agente_id && item.nome) return item
          if (item.value !== undefined && item.label !== undefined)
            return { agente_id: item.value, situacao_atual: true }
          return null
        })
        .filter(Boolean)
    }
    return payload
  }

  const handleAreaSaved = (updated: BackendRow) => {
    if (!updated?.area_de_visita_id) return
    setData(prev =>
      prev.map(row =>
        row.area_de_visita_id === updated.area_de_visita_id ? normalize(updated) : row,
      ),
    )
  }

  const selectedCount = table.getSelectedRowModel().rows.length
  const allSelected = table.getIsAllPageRowsSelected()
  const toggleAllSelected = () => table.toggleAllPageRowsSelected()

  const filtrosTabela: FiltroConfig<RowData>[] = [
    { key: "setor", label: "Identificador da área" },
    { key: "bairro", label: "Bairro" },
    { key: "agente", label: "Agente responsável" },
  ]


  return (
    <Card className="space-y-4 min-w-[180px] p-2 lg:p-4 xl:p-6 border-none shadow-none">
      {selectedCount === 0 && (
        <TabelaFiltro<RowData>
          filtros={filtrosTabela}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          tempFilters={tempFilters}
          setTempFilters={setTempFilters}
          setFilters={setFilters}
          uniqueValues={uniqueValues}
          selectedCount={selectedCount}
          allSelected={allSelected}
          toggleAllSelected={toggleAllSelected}
        />
      )}

      {renderBar()}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">{error}</div>
      ) : (
        <>
          <Tabela table={table} />
          <TabelaPaginacao<RowData> table={table} />
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirmação</DialogTitle>
            <DialogDescription className="text-gray-700">
              {confirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              variant="destructive"
              onClick={() => {
                confirmAction()
                setConfirmOpen(false)
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalDetalhes<BackendRow>
        id={selectedId}
        endpoint="/area_de_visita"
        campos={[
          "setor",
          "estado",
          "municipio",
          "cep",
          "bairro",
          "numero_quarteirao",
          "logadouro",
          "agentes",
          "status",
        ]}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editableFields={["numero_quarteirao", "setor", "logadouro", "bairro", "status",]}
        nomeDoCampo="nome"
        fieldLabels={fieldLabels}
        selectFields={["status"]}
        sendAsJson
        selectOptions={{
          agentes: agentesOptions,
          status: Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          })),
        }}
        onBeforeSubmit={handleSubmitCustom}
        renderField={renderField}
        fieldsTwoColumns={[
          "estado",
          "cep",
          "municipio",
          "bairro",
          "numero_quarteirao",
          "setor",
        ]}
        fieldsFullWidth={["logadouro"]}
        canEdit={canEdit}
        onSaved={handleAreaSaved}
      />
    </Card>
  )
}
