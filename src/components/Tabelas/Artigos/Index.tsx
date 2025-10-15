"use client"

import { useState, useMemo, useEffect } from "react"
import {useReactTable,getCoreRowModel,getFilteredRowModel,getSortedRowModel,getPaginationRowModel,type ColumnDef } from "@tanstack/react-table"
import { format, isValid } from "date-fns"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, EllipsisVertical, Eye, X } from "lucide-react"
import { api } from "@/services/api"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"

// --- TIPAGEM ---
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

  const uniqueValues = (key: keyof RowData) =>
    Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  // --- BUSCA DE DADOS ---
  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: res, status } = await api.get("/artigo")
        if (status !== 200) throw new Error("Erro ao buscar artigos")

        let artigos: RowData[] = res.map((a: Artigo) => ({
          id: a.artigo_id,
          titulo: a.titulo ?? "Não informado",
          descricao: a.descricao ?? "Não informado",
          supervisor: a.supervisor_nome ?? "Não informado",
          data: a.data_criacao ? format(new Date(a.data_criacao), "dd/MM/yyyy") : "Não informado",
          link: a.link_artigo ?? "",
          imagem: a.imagem_nome ?? "",
        }))

        if (globalFilter) {
          const termo = globalFilter.toLowerCase()
          artigos = artigos.filter(r =>
            Object.values(r).some(v =>
              Array.isArray(v) ? v.join(", ").toLowerCase().includes(termo) : String(v).toLowerCase().includes(termo)
            )
          )
        }

        Object.entries(filters).forEach(([k, vals]) => {
          if (vals.length) artigos = artigos.filter(r => vals.includes(String(r[k as keyof RowData])))
        })

        if (dateRange[0] && dateRange[1]) {
          artigos = artigos.filter(r => {
            const [d, m, y] = (r.data ?? "").split("/").map(Number)
            const dt = new Date(y, m - 1, d)
            return isValid(dt) && dt >= dateRange[0]! && dt <= dateRange[1]!
          })
        }

        const start = pageIndex * pageSize
        setData(artigos.slice(start, start + pageSize))
        setTotalRows(artigos.length)
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [pageIndex, pageSize, filters, dateRange, globalFilter])

  // --- AÇÕES ---
  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [show, setShow] = useState(false)
    const toggle = () => setShow(!show)
    const handle = (action: string) => {
      console.log(action, row.original)
      toggle()
    }
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
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-blue-500" onClick={() => handle("Editar")}>
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-1 text-red-600 hover:text-red-900" onClick={() => handle("Excluir")}>
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
    { accessorKey: "titulo", header: () => <span className="font-bold">Título</span>, cell: ({ getValue }) => <span className="font-semibold text-gray-700">{getValue() as string}</span> },
    { accessorKey: "descricao", header: "Descrição" },
    { accessorKey: "supervisor", header: "Supervisor" },
    { accessorKey: "data", header: "Data de criação" },
    { id: "acoes", header: "Ações", cell: ({ row }) => <AcoesCell row={row} />, size: 60 },
  ], [])

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

  const filtros: FiltroConfig<RowData>[] = [
    { key: "data", label: "Intervalo de datas", type: "date" },
    { key: "supervisor", label: "Supervisor" },
  ]

  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">
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

      <ModalDetalhes<Artigo>
        id={selectedId}
        endpoint="/artigo"
        campos={["artigo_id", "titulo", "descricao", "supervisor_nome", "data_criacao", "link_artigo", "imagem_nome"]}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        renderField={(field, value) => {
          const labels: Record<string, string> = {
            artigo_id: "ID",
            titulo: "Título",
            descricao: "Descrição",
            supervisor_nome: "Supervisor",
            data_criacao: "Data de criação",
            link_artigo: "Link",
            imagem_nome: "Imagem",
          }
          if (field === "link_artigo" && value)
            return (
              <div>
                <strong>{labels[field]}:</strong>{" "}
                <a href={String(value)} target="_blank" className="text-blue-700 underline">{value}</a>
              </div>
            )
          if (field === "imagem_nome" && value)
            return (
              <div>
                <strong>{labels[field]}:</strong> {String(value)}
              </div>
            )
          return (
            <div>
              <strong>{labels[field] ?? field}:</strong> {String(value ?? "Não informado")}
            </div>
          )
        }}
      />
    </Card>
  )
}
export default Index