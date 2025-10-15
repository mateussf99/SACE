"use client"

import { useState, useMemo, useEffect } from "react"
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, X, EllipsisVertical, Eye } from "lucide-react"

import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import { api } from "@/services/api"

export type RowData = {
  area_de_visita_id?: number
  setor?: string
  estado?: string
  municipio?: string
  logradouro?: string
  agente?: string
  bairro?: string
}

export interface BackendRow {
  area_de_visita_id?: number
  bairro?: string
  cep?: string
  estado?: string
  logadouro?: string
  logradouro?: string
  municipio?: string
  numero_quarteirao?: number
  setor?: string
  agentes?: { agente_id?: number; nome?: string; situacao_atual?: boolean }[]
}

function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], bairro: [] })
  const [tempFilters, setTempFilters] = useState({ ...filters })
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const normalize = (r: BackendRow): RowData => {
    const safe = (v?: unknown) => (typeof v === "string" && v.trim() ? v : "Não informado")
    return {
      area_de_visita_id: r.area_de_visita_id,
      setor: safe(r.setor),
      estado: safe(r.estado),
      municipio: safe(r.municipio),
      logradouro: safe(r.logradouro ?? r.logadouro),
      agente: r.agentes?.length ? r.agentes.map(a => a.nome).join(", ") : "Não informado",
      bairro: safe(r.bairro),
    }
  }

  const uniqueValues = (key: keyof RowData) => {
    if (key === "agente") {
      return Array.from(new Set(data.flatMap(r => r.agente?.split(", ").map(a => a.trim()) ?? [])))
    }
    return Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)
  }

  useEffect(() => {
    const carregar = async () => {
      setLoading(true); setError(null)
      try {
        const res = await api.get("/area_de_visita", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        })
        let all: RowData[] = Array.isArray(res.data) ? res.data.map((r: BackendRow) => normalize(r)) : []

        if (globalFilter) {
          const s = globalFilter.toLowerCase()
          all = all.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(s)))
        }
        Object.entries(filters).forEach(([k, vals]) => {
          if (vals.length)
            all = all.filter(r => {
              const val = r[k as keyof RowData]
              if (k === "agente" && typeof val === "string") {
                return val.split(", ").some(name => vals.includes(name))
              }
              return Array.isArray(val)
                ? val.some(v => vals.includes(v))
                : vals.includes(String(val))
            })
        })
        setTotalRows(all.length)
        const start = page.pageIndex * page.pageSize
        setData(all.slice(start, start + page.pageSize))
      } catch (e) {
        console.error(e); setError("Erro ao carregar dados"); setData([])
      } finally { setLoading(false) }
    }
    carregar()
  }, [page.pageIndex, page.pageSize, filters, globalFilter])

  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen(p => !p)
    const ver = () => { toggle(); setSelectedId(row.original.area_de_visita_id ?? null); setIsModalOpen(true) }

    return (
      <div className="flex items-center gap-2">
        {!open ? (
          <button className="p-1 hover:text-blue-900" onClick={toggle}><EllipsisVertical className="w-4 h-4 text-blue-700" /></button>
        ) : (
          <>
            <button className="p-1 hover:text-green-700" onClick={ver}><Eye className="w-4 h-4" /></button>
            <button className="p-1 hover:text-blue-500" onClick={() => { console.log("Editar", row.original); toggle() }}><Edit className="w-4 h-4" /></button>
            <button className="p-1 text-red-600 hover:text-red-900" onClick={() => { console.log("Excluir", row.original); toggle() }}><Trash2 className="w-4 h-4" /></button>
            <button className="p-1 hover:text-gray-600" onClick={toggle}><X className="w-4 h-4" /></button>
          </>
        )}
      </div>
    )
  }

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    {
      id: "select",
      header: ({ table }) => <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} className="h-4 w-4 rounded border-2 border-blue-600" />,
      cell: ({ row }) => <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="h-4 w-4 rounded border-2 border-blue-600" />,
      size: 40
    },
    { accessorKey: "setor", header: "Identificador do setor", cell: ({ getValue }) => <span className="font-semibold text-blue-800">{getValue() as string}</span> },
    { accessorKey: "estado", header: "Estado" },
    { accessorKey: "municipio", header: "Município" },
    { accessorKey: "logradouro", header: "Logradouro", cell: ({ getValue }) => <span className="font-semibold text-gray-700">{getValue() as string}</span> },
    { accessorKey: "agente", header: "Agente responsável" },
    { accessorKey: "bairro", header: "Bairro" },
    { id: "acoes", header: "Ações", cell: ({ row }) => <AcoesCell row={row} />, size: 60 }
  ], [])

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRows / page.pageSize),
    state: { globalFilter, rowSelection, pagination: page },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: up => {
      const s = typeof up === "function" ? up(page) : up
      setPage(s)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true
  })

  const selectedCount = table.getSelectedRowModel().rows.length
  const allSelected = table.getIsAllPageRowsSelected()
  const toggleAllSelected = () => table.toggleAllPageRowsSelected()

  const renderBar = () => selectedCount > 0 && (
    <div className="flex items-center justify-between p-2 mb-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="checkbox" checked={allSelected} onChange={toggleAllSelected} className="h-4 w-4 rounded border-2 border-blue-600" />
        <span>Selecionar todos</span>
        <button className="flex items-center gap-1 p-1 text-red-600 hover:text-red-900" onClick={() => console.log("Excluir selecionados", table.getSelectedRowModel().rows)}>
          <Trash2 className="w-4 h-4" /><span>Excluir</span>
        </button>
      </div>
      <button className="p-1 hover:text-gray-700" onClick={() => table.toggleAllPageRowsSelected(false)}>
        <X className="w-6 h-6 text-gray-800 hover:text-black" />
      </button>
    </div>
  )

  const filtros: FiltroConfig<RowData>[] = [
    { key: "setor", label: "Identificador da área" },
    { key: "bairro", label: "Bairro" },
    { key: "agente", label: "Agente responsável" },
  ]

  const renderField = (f: keyof BackendRow, v: BackendRow[keyof BackendRow]) => {
    const lbl: Record<string, string> = {
      area_de_visita_id: "ID da Área de Visita", bairro: "Bairro", cep: "CEP", estado: "Estado",
      logadouro: "Logradouro", municipio: "Município", numero_quarteirao: "Número do Quarteirão",
      setor: "Setor", agentes: "Agentes Responsáveis",
    }

    if (f === "agentes" && Array.isArray(v))
      return (
        <div>
          <strong>{lbl[f]}:</strong>
          <ul className="list-disc ml-5">
            {v.map((a, i) => (
              <li key={i}>
                <span className="font-semibold text-blue-700">{a.nome ?? "Não informado"}</span>
                {a.situacao_atual !== undefined && <span className="ml-2 text-gray-700">({a.situacao_atual ? "Ativo" : "Desligado"})</span>}
              </li>
            ))}
          </ul>
        </div>
      )

    return (
      <div>
        <strong>{lbl[f] ?? String(f)}:</strong>{" "}
        {v == null ? "Não informado" : Array.isArray(v) ? v.join(", ") : String(v)}
      </div>
    )
  }

  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">
      {selectedCount === 0 && (
        <TabelaFiltro<RowData>
          filtros={filtros}
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
      {loading ? <div className="text-center py-10 text-gray-500">Carregando...</div> :
        error ? <div className="text-center py-10 text-red-600">{error}</div> :
          <>
            <Tabela table={table} />
            <TabelaPaginacao<RowData> table={table} />
          </>
      }
      <ModalDetalhes<BackendRow>
        id={selectedId}
        endpoint="/area_de_visita"
        campos={["area_de_visita_id", "bairro", "cep", "estado", "logadouro", "municipio", "numero_quarteirao", "setor", "agentes"]}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        renderField={renderField}
      />
    </Card>
  )
}

export default Index
