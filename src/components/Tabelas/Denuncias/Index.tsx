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
import { format, isValid } from "date-fns"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, EllipsisVertical, X } from "lucide-react"
import { api } from "@/services/api"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, {
  type FiltroConfig,
} from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import { useAuth } from "@/contexts/AuthContext"

export type Denuncia = {
  denuncia_id?: number
  data_denuncia?: string
  hora_denuncia?: string
  bairro?: string
  rua_avenida?: string
  numero?: number
  endereco_complemento?: string
  tipo_imovel?: string
  observacoes?: string
  supervisor_id?: number
  agente_responsavel_id?: number
  nome_completo?: string
  arquivos?: { arquivo_denuncia_id: number; arquivo_nome: string }[]
  cpf?: string
  email?: string
  status?: string
  endereco_completo?: string
}

export type RowData = {
  id?: number
  data?: string
  municipio?: string
  bairro?: string
  endereco?: string
  agente?: string
  status?: string
  tipo_imovel?: string
  observacoes?: string
  arquivos?: { arquivo_denuncia_id: number; arquivo_nome: string }[]
  supervisor_id?: number
  agente_responsavel_id?: number
  endereco_completo?: string
}

export type DenunciasTabelaProps = {

  initialData?: Denuncia[]

  disableOwnFetch?: boolean
}


const fieldLabels: Record<string, string> = {
  data_denuncia: "Data",
  hora_denuncia: "Hora",
  bairro: "Bairro",
  tipo_imovel: "Tipo de Imóvel",
  rua_avenida: "Rua/Avenida",
  numero: "N°",
  endereco_complemento: "Complemento",
  observacoes: "Observações",
  agente_responsavel_id: "Agente Responsável",
  status: "Status",
  arquivos: "Arquivos",
}
const STATUS_LABEL: Record<string, string> = {
  "Concluída": "Concluída",
  "Pendente": "Pendente",
  "Em Análise": "Em análise", 
}
const statusColors: Record<string, string> = {
  "Concluída": "bg-green-100 text-green-700 border border-green-700",
  "Pendente": "bg-red-100 text-red-700 border border-red-700",
  "Em Análise": "bg-yellow-100 text-yellow-700 border border-yellow-700",
  default: "bg-gray-100 text-gray-700 border border-gray-700",
}

const statusOptions = Object.entries(STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const buildEndereco = (rua?: string, numero?: number | string) =>
  `${rua ?? ""}, ${numero ?? ""}`.trim()

const formatData = (data?: string) =>
  data ? format(new Date(data), "dd/MM/yyyy") : "Não informado"

const aplicarFiltros = (
  rows: RowData[],
  globalFilter: string,
  filters: Record<string, string[]>,
  dateRange: [Date | null, Date | null],
) => {
  let filtered = [...rows]

  if (globalFilter) {
    const search = globalFilter.toLowerCase()
    filtered = filtered.filter(r =>
      Object.values(r).some(v =>
        Array.isArray(v)
          ? v.join(", ").toLowerCase().includes(search)
          : String(v).toLowerCase().includes(search),
      ),
    )
  }

  for (const [key, vals] of Object.entries(filters)) {
    if (vals.length) {
      filtered = filtered.filter(r =>
        vals.includes(String(r[key as keyof RowData])),
      )
    }
  }

  if (dateRange[0] && dateRange[1]) {
    const [start, end] = dateRange
    filtered = filtered.filter(r => {
      const [d, m, y] = (r.data ?? "").split("/").map(Number)
      const dt = new Date(y, m - 1, d)
      return isValid(dt) && dt >= start! && dt <= end!
    })
  }

  return filtered
}


function DenunciaArquivoImg({
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
        const resp = await api.get(`/denuncia/arquivo/${arquivoId}`, {
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
        console.error("Erro ao carregar imagem de denúncia:", e)
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


const StatusBadge = ({ value }: { value: string }) => {
  const colorClass = statusColors[value] ?? statusColors.default
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${colorClass}`}>
      {value}
    </span>
  )
}

const AcoesCell = ({
  row,
  onEdit,
  onDelete,
}: {
  row: { original: RowData }
  onEdit: (id: number | null) => void
  onDelete: (id: number) => void
}) => {
  const [open, setOpen] = useState(false)
  const id = row.original.id ?? null

  return (
    <div className="flex items-center gap-2">
      {!open ? (
        <button className="p-1 hover:text-blue-900" onClick={() => setOpen(true)}>
          <EllipsisVertical className="w-4 h-4 text-blue-700" />
        </button>
      ) : (
        <>
          <button
            className="p-1 hover:text-green-700"
            onClick={() => {
              console.log("Clicou na denúncia:", id)
              onEdit(id)
              setOpen(false)
            }}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900"
            onClick={() => {
              if (id != null) onDelete(id)
              setOpen(false)
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-gray-600" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}

export default function Index({
  initialData,
  disableOwnFetch = false,
}: DenunciasTabelaProps) {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({
    bairro: [],
    status: [],
  })
  const [tmpFilters, setTmpFilters] = useState(filters)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ])
  const [tmpDateRange, setTmpDateRange] = useState(dateRange)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {})
  const [agentesOptions, setAgentesOptions] = useState<
    { id: number; nome: string }[]
  >([])

  const { accessLevel } = useAuth()
const role = (accessLevel ?? "").toLowerCase()
const isAgente = role.includes("agente")


  const confirmDelete = (action: () => void, desc = "Deseja realmente excluir?") => {
    setConfirmAction(() => action)
    setConfirmDescription(desc)
    setConfirmOpen(true)
  }

  const deletarDenuncia = async (ids: number[]) => {
    if (!ids.length) return
    try {
      const { data } = await api.delete(`/denuncia/${ids}`)
      return data
    } catch (e: any) {
      const msg: Record<number, string> = {
        400: "Requisição inválida.",
        401: "Não autenticado.",
        403: "Acesso proibido.",
        404: "Denúncia não encontrada.",
      }
      alert(msg[e.response?.status] || "Erro interno.")
      throw e
    }
  }

  const uniqValues = (key: keyof RowData) =>
    Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  useEffect(() => {
    api
      .get("/usuarios", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      })
      .then(res => {
        console.log("🔍 RESPOSTA DA API /usuarios:", res.data)
        setAgentesOptions(
          res.data.agentes.map((a: any) => ({
            id: a.agente_id,
            nome: a.nome_completo,
          })),
        )
      })
      .catch(err => console.error("❌ ERRO /usuarios:", err))
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        let denuncias: Denuncia[] = []

        if (initialData && initialData.length) {

          denuncias = initialData
        } else {
          if (disableOwnFetch) {

            setData([])
            setTotalRows(0)
            return
          }


          const res = await api.get("/denuncia")
          if (res.status !== 200) throw new Error("Erro ao buscar denúncias")
          denuncias = res.data as Denuncia[]
        }

        const rows: RowData[] = await Promise.all(
          denuncias.map(async d => {
            let agenteNome = "Não definido"
            if (d.agente_responsavel_id) {
              try {
                const agenteRes = await api.get(
                  `/usuarios/agente/${d.agente_responsavel_id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
                    },
                  },
                )
                agenteNome = agenteRes.data.nome_completo ?? "Não definido"
              } catch {
                agenteNome = "Não definido"
              }
            }
            return {
              id: d.denuncia_id,
              data: formatData(d.data_denuncia),
              bairro: d.bairro ?? "Não informado",
              endereco_completo: buildEndereco(d.rua_avenida, d.numero),
              endereco_complemento: d.endereco_complemento,
              agente: agenteNome,
              status: d.status ?? "Pendente",
              tipo_imovel: d.tipo_imovel,
              observacoes: d.observacoes,
              arquivos: d.arquivos,
              supervisor_id: d.supervisor_id,
              agente_responsavel_id: d.agente_responsavel_id,
            }
          }),
        )

        const filteredRows = aplicarFiltros(
          rows,
          globalFilter,
          filters,
          dateRange,
        )
        const start = page.pageIndex * page.pageSize
        setData(filteredRows.slice(start, start + page.pageSize))
        setTotalRows(filteredRows.length)
      } catch {
        setError("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    })()
  }, [
    page,
    filters,
    dateRange,
    globalFilter,
    initialData,
    disableOwnFetch,
  ])

  const handleEditRow = (id: number | null) => {
    setSelectedId(id)
    setIsModalOpen(true)
  }

  const handleDeleteRow = (id: number) =>
    confirmDelete(
      async () => {
        const resp = await deletarDenuncia([id])
        alert(resp.message)
        setData(p => p.filter(d => d.id !== id))
      },
      "Deseja realmente excluir esta área?",
    )

 const columns = useMemo<ColumnDef<RowData>[]>(() => {
  const cols: ColumnDef<RowData>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "data", header: "Data" },
    { accessorKey: "bairro", header: "Bairro" },
    {
      accessorKey: "endereco_completo",
      header: () => <span className="font-bold">Endereço</span>,
      cell: ({ row, getValue }) => (
        <span
          className="font-semibold cursor-pointer hover:underline"
          onClick={() => handleEditRow(row.original.id ?? null)}
        >
          {getValue() as string}
        </span>
      ),
    },
  ]

  if (isAgente) {
    cols.push({
      accessorKey: "tipo_imovel",
      header: "Tipo de imóvel",
    })
  } else {
    cols.push({
      accessorKey: "agente",
      header: "Agente responsável",
    })
  }

  cols.push(
    {
      accessorKey: "status",
      header: "Status",
       cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <AcoesCell row={row} onEdit={handleEditRow} onDelete={handleDeleteRow} />
      ),
    },
  )

  return cols
}, [data, isAgente])


  const table = useReactTable({
    data,
    columns,
    pageCount: Math.max(1, Math.ceil(totalRows / page.pageSize)),
    state: { globalFilter, pagination: page },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: updater =>
      setPage(typeof updater === "function" ? updater(page) : updater),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualFiltering: true,
  })

  const filtros: FiltroConfig<RowData>[] = [
    { key: "data", label: "Intervalo de datas", type: "date" },
    { key: "bairro", label: "Bairro" },
    { key: "status", label: "Status" },
  ]

 const renderField = (field: keyof Denuncia, value: unknown) => (
  <div className="flex flex-col">
    <strong>{fieldLabels[field] ?? field}:</strong>{" "}
    {String(value ?? "Não informado")}
  </div>
)


  const handleDenunciaSaved = (updated: Denuncia) => {
    if (!updated?.denuncia_id) return

    const idAgente =
      updated.agente_responsavel_id != null
        ? Number(updated.agente_responsavel_id)
        : undefined

    let agenteNome = "Não definido"
    if (idAgente != null && !Number.isNaN(idAgente)) {
      const found = agentesOptions.find(a => a.id === idAgente)
      if (found) agenteNome = found.nome
    }

    setData(prev =>
      prev.map(row =>
        row.id === updated.denuncia_id
          ? {
              ...row,
              agente: agenteNome,
              agente_responsavel_id: idAgente ?? row.agente_responsavel_id,
              status: updated.status ?? row.status,
              tipo_imovel: updated.tipo_imovel ?? row.tipo_imovel,
              endereco_completo:
                updated.rua_avenida || updated.numero
                  ? buildEndereco(updated.rua_avenida, updated.numero)
                  : row.endereco_completo,
              observacoes: updated.observacoes ?? row.observacoes,
               arquivos: updated.arquivos ?? row.arquivos,
            }
          : row,
      ),
    )
  }

  const customViewers = {
  agente_responsavel_id: (args: any) => {
    const idNum = args.value != null ? Number(args.value) : undefined
    const found =
      idNum != null && !Number.isNaN(idNum)
        ? agentesOptions.find(a => a.id === idNum)
        : undefined
    return (
      <div className="flex flex-col">
        <strong>{args.label}:</strong> {found?.nome ?? "Não definido"}
      </div>
    )
  },

  arquivos: ({ value, label }: { value: any; label: string }) => {
    const arr = Array.isArray(value) ? value : []

    if (!arr.length) {
      return (
        <div className="flex flex-col gap-2">
          <strong>{label ?? "Arquivos"}:</strong>
          <span className="text-sm text-gray-500">Nenhum arquivo</span>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <strong>{label ?? "Arquivos"}:</strong>

        {/* imagens lado a lado, quebrando linha se não couber */}
        <div className="flex flex-wrap gap-4 mt-2">
          {arr.map(
            (a: { arquivo_denuncia_id: number; arquivo_nome: string }) => (
              <div
                key={a.arquivo_denuncia_id}
                className="flex flex-col items-start gap-1"
              >
                <DenunciaArquivoImg
                  arquivoId={a.arquivo_denuncia_id}
                  nome={a.arquivo_nome}
                />
              </div>
            ),
          )}
        </div>
      </div>
    )
  },
}

  return (
    <Card className="space-y-4 min-w-[170px] p-2 lg:p-4 xl:p-6 border-none shadow-none">
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
        toggleAllSelected={() => {}}
      />

      {loading ? (
        <p className="text-center py-10 text-gray-500">Carregando...</p>
      ) : error ? (
        <p className="text-center py-10 text-red-600">{error}</p>
      ) : (
        <>
          <Tabela table={table} />
          <TabelaPaginacao<RowData> table={table} />
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Confirmação
            </DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
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

      <ModalDetalhes<Denuncia>
        id={selectedId}
        endpoint="/denuncia"
        campos={Object.keys(fieldLabels) as (keyof Denuncia)[]}
        open={isModalOpen}
        editableFields={["agente_responsavel_id", "status"]}
        selectFields={["agente_responsavel_id", "status"]}
        selectOptions={{ status: statusOptions,
          agente_responsavel_id: agentesOptions.map(a => ({
            label: a.nome,
            value: a.id,
          })),
        }}
        onOpenChange={setIsModalOpen}
        renderField={renderField}
        fieldLabels={fieldLabels}
        fieldsTwoColumns={[
          "data_denuncia",
          "hora_denuncia",
          "bairro",
          "status",
          "agente_responsavel_id",
          "tipo_imovel",
          "numero",
          "rua_avenida",
        ]}
        fieldsFullWidth={["observacoes", "arquivos"]}
        sendAsJson={false}
        onSaved={handleDenunciaSaved}
        customViewers={customViewers}
      />
    </Card>
  )
}
