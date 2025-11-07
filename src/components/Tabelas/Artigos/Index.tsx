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
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"


export type Artigo = {
  artigo_id?: number
  supervisor_id?: number
  data_criacao?: string
  link_artigo?: string
  titulo?: string
  descricao?: string
  imagem_nome?: string
  supervisor_nome?: string
}

export type RowData = {
  id?: number
  titulo?: string
  descricao?: string
  supervisor?: string
  data?: string
  link?: string
  imagem?: string
}


const filtros: FiltroConfig<RowData>[] = [
  { key: "data", label: "Intervalo de datas", type: "date" },
  { key: "supervisor", label: "Supervisor" },
]

const fieldLabels: Record<string, string> = {
  artigo_id: "ID",
  titulo: "Título",
  descricao: "Descrição",
  supervisor_nome: "Supervisor",
  data_criacao: "Data de criação",
  link_artigo: "Link",
  imagem_nome: "Imagem",
}

const formatArtigoToRow = (a: Artigo): RowData => ({
  id: a.artigo_id,
  titulo: a.titulo ?? "Não informado",
  descricao: a.descricao ?? "Não informado",
  supervisor: a.supervisor_nome ?? "Não informado",
  data: a.data_criacao ? format(new Date(a.data_criacao), "dd/MM/yyyy") : "Não informado",
  link: a.link_artigo ?? "",
  imagem: a.imagem_nome ?? "",
})

const applyFilters = (
  rows: RowData[],
  globalFilter: string,
  filters: Record<string, string[]>,
  [start, end]: [Date | null, Date | null],
) => {
  let artigos = [...rows]

  if (globalFilter) {
    const termo = globalFilter.toLowerCase()
    artigos = artigos.filter(r =>
      Object.values(r).some(v => String(v ?? "").toLowerCase().includes(termo)),
    )
  }

  Object.entries(filters).forEach(([k, vals]) => {
    if (!vals.length) return
    artigos = artigos.filter(r => vals.includes(String(r[k as keyof RowData] ?? "")))
  })

  if (start && end) {
    artigos = artigos.filter(r => {
      const [d, m, y] = (r.data ?? "").split("/").map(Number)
      const dt = new Date(y, m - 1, d)
      return isValid(dt) && dt >= start && dt <= end
    })
  }

  return artigos
}

const deletarArtigo = async (artigo_id?: number) => {
  if (!artigo_id) return
  try {
    const { data } = await api.delete(`/artigo/${artigo_id}`)
    return data
  } catch (e: any) {
    const msg: Record<number, string> = {
      401: "Não autenticado. Token JWT ausente ou inválido.",
      403: "Acesso proibido. Apenas supervisores podem deletar.",
      404: "Artigo não encontrado.",
    }
    alert(msg[e.response?.status] || "Erro interno do servidor.")
    throw e
  }
}

const buildArtigoPayload = (payload: Partial<Artigo>) => {
  const out: any = {}
  if (payload.titulo != null) out.titulo = payload.titulo
  if (payload.descricao != null) out.descricao = payload.descricao
  if (payload.link_artigo != null) out.link_artigo = payload.link_artigo

  const possibleFile = (payload as any).imagem_nome
  if (possibleFile instanceof File) out.imagem = possibleFile

  return out
}

function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ supervisor: [] })
  const [tempFilters, setTempFilters] = useState({ ...filters })
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([...dateRange])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {})

  const uniqueValues = (key: keyof RowData) =>
    Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  const confirmDelete = (action: () => void, description = "Deseja realmente excluir?") => {
    setConfirmAction(() => action)
    setConfirmDescription(description)
    setConfirmOpen(true)
  }


  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: res, status } = await api.get("/artigo")
        if (status !== 200) throw new Error("Erro ao buscar artigos")

        const artigosRaw: RowData[] = res.map((a: Artigo) => formatArtigoToRow(a))
        const artigosFiltrados = applyFilters(artigosRaw, globalFilter, filters, dateRange)

        const start = pageIndex * pageSize
        setData(artigosFiltrados.slice(start, start + pageSize))
        setTotalRows(artigosFiltrados.length)
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [pageIndex, pageSize, filters, dateRange, globalFilter])

  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [show, setShow] = useState(false)
    const toggle = () => setShow(prev => !prev)

    const abrir = () => {
      if (row.original.id) {
        setSelectedId(row.original.id)
        setIsModalOpen(true)
      }
      toggle()
    }

    return (
      <div className="flex items-center gap-2">
        {!show ? (
          <button className="p-1 hover:text-blue-900" onClick={toggle}>
            <EllipsisVertical className="w-4 h-4 text-blue-700" />
          </button>
        ) : (
          <>
            <button className="p-1 hover:text-green-700" onClick={abrir}>
              <Edit className="w-4 h-4" />
            </button>
            <button
              className="p-1 text-red-600 hover:text-red-900"
              onClick={() =>
                confirmDelete(
                  async () => {
                    try {
                      const resp = await deletarArtigo(row.original.id!)
                      if (resp?.message) alert(resp.message)
                      setData(p => p.filter(d => d.id !== row.original.id))
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
            <button className="p-1 hover:text-gray-600" onClick={toggle}>
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "titulo",
      header: () => <span className="font-bold">Título</span>,
      cell: ({ row, getValue }) => (
        <span
          className="font-semibold cursor-pointer hover:underline"
          onClick={() => {
            setSelectedId(row.original.id ?? null)
            setIsModalOpen(true)
          }}
        >
          {getValue() as string}
        </span>
      ),
    },
    { accessorKey: "descricao", header: "Descrição" },
    { accessorKey: "supervisor", header: "Supervisor" },
    { accessorKey: "data", header: "Data de criação" },
    { id: "acoes", header: "Ações", cell: ({ row }) => <AcoesCell row={row} />, size: 60 },
  ], [])

  const handleArtigoSaved = (updated: Artigo) => {
    if (!updated?.artigo_id) return
    setData(prev =>
      prev.map(row =>
        row.id === updated.artigo_id
          ? {
              id: updated.artigo_id,
              titulo: updated.titulo ?? row.titulo,
              descricao: updated.descricao ?? row.descricao,
              supervisor: updated.supervisor_nome ?? row.supervisor,
              data: updated.data_criacao ? format(new Date(updated.data_criacao), "dd/MM/yyyy") : row.data,
              link: updated.link_artigo ?? row.link,
              imagem: updated.imagem_nome ?? row.imagem,
            }
          : row,
      ),
    )
  }

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRows / pageSize),
    state: { globalFilter, rowSelection, pagination: { pageIndex, pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: up => {
      const s = typeof up === "function" ? up({ pageIndex, pageSize }) : up
      setPageIndex(s.pageIndex)
      setPageSize(s.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true,
  })

  return (
    <Card className="space-y-4 min-w-[170px] p-2 lg:p-4 xl:p-6 border-none  shadow-none">
      <TabelaFiltro<RowData>
        filtros={filtros}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        tempFilters={tempFilters}
        setTempFilters={setTempFilters}
        tempDateRange={tempDateRange}
        setTempDateRange={setTempDateRange}
        setFilters={setFilters}
        setAppliedDateRange={setDateRange}
        uniqueValues={uniqueValues}
        selectedCount={0}
        allSelected={false}
        toggleAllSelected={() => {}}
      />

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

      <ModalDetalhes<Artigo>
        id={selectedId}
        endpoint="/artigo"
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        campos={[
          "artigo_id",
          "data_criacao",
          "supervisor_nome",
          "imagem_nome",
          "titulo",
          "descricao",
          "link_artigo",
        ]}
        fieldLabels={fieldLabels}
        editableFields={["titulo", "descricao", "link_artigo", "imagem_nome"]}
        nomeDoCampo="imagem_nome"
        sendAsJson={false}
        onBeforeSubmit={buildArtigoPayload}
        onSaved={handleArtigoSaved}
        renderField={(field, value) => {
          const label = fieldLabels?.[field] ?? field
          if (field === "link_artigo" && value) {
            return (
              <div className="flex flex-col">
                <strong>{label}:</strong>{" "}
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline"
                >
                  {value}
                </a>
              </div>
            )
          }
          return (
            <div className="flex flex-col">
              <strong>{label}:</strong> {String(value ?? "Não informado")}
            </div>
          )
        }}
        fieldsTwoColumns={["supervisor_nome", "data_criacao"]}
        fieldsFullWidth={["titulo", "descricao", "link_artigo"]}
      />
    </Card>
  )
}

export default Index
