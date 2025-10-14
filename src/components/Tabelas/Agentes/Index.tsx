"use client"

import { useState, useMemo, useEffect } from "react"
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getPaginationRowModel, type ColumnDef
} from "@tanstack/react-table"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, X, EllipsisVertical, Eye } from "lucide-react"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import { api } from "@/services/api"

export interface Agente {
  usuario_id?: number; nome_completo?: string; email?: string
  telefone_ddd?: string | number; telefone_numero?: string
  estado?: string; municipio?: string; situacao_atual?: boolean
  setor_de_atuacao?: { setor?: string; bairro?: string }[]
}
export type RowData = {
  nome?: string; contato?: string; zonasResponsavel?: string[]
  localidade?: string; situacao?: "Ativo" | "Desligado" | "Não informado"
  usuario_id?: number; email?: string; estado?: string; municipio?: string
  setor_de_atuacao?: { setor?: string; bairro?: string }[]
}

function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], bairro: [] })
  const [tempFilters, setTempFilters] = useState({ ...filters })
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const sanitize = (r: Agente): RowData => ({
    usuario_id: r.usuario_id,
    nome: r.nome_completo?.trim() || "Não informado",
    email: r.email || "Não informado",
    contato: r.telefone_numero ? `(${r.telefone_ddd}) ${r.telefone_numero}` : "Não informado",
    zonasResponsavel: r.setor_de_atuacao?.length ? r.setor_de_atuacao.map(s => s.setor || "Não informado") : ["Não informado"],
    localidade: r.municipio?.trim() || "Não informado",
    estado: r.estado || "Não informado",
    municipio: r.municipio || "Não informado",
    setor_de_atuacao: r.setor_de_atuacao,
    situacao: r.situacao_atual === true ? "Ativo" : r.situacao_atual === false ? "Desligado" : "Não informado",
  })

  const uniqueValues = (key: keyof RowData) =>
    Array.from(new Set(key === "zonasResponsavel"
      ? data.flatMap(r => r.zonasResponsavel ?? [])
      : data.map(r => r[key]).filter(Boolean)
    )).map(String)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null)
      try {
        const { data: resp } = await api.get("/usuarios", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` }
        })
        let allData: RowData[] = Array.isArray(resp.agentes) ? resp.agentes.map(sanitize) : []
        if (globalFilter) {
          const s = globalFilter.toLowerCase()
          allData = allData.filter(r => Object.values(r).some(v =>
            Array.isArray(v) ? v.join(", ").toLowerCase().includes(s) : String(v).toLowerCase().includes(s)
          ))
        }
        Object.entries(filters).forEach(([k, vals]) => vals.length && (allData = allData.filter(r => {
          const val = r[k as keyof RowData]
          return Array.isArray(val)
            ? (typeof val[0] === "string"
              ? (val as string[]).some(v => vals.includes(v))
              : (val as { setor?: string; bairro?: string }[]).some(v => vals.includes(v.setor ?? "") || vals.includes(v.bairro ?? "")))
            : vals.includes(String(val))
        })))
        const start = pageIndex * pageSize
        setData(allData.slice(start, start + pageSize))
        setTotalRows(allData.length)
      } catch {
        setError("Erro ao carregar dados"); setData([])
      } finally { setLoading(false) }
    }
    fetchData()
  }, [pageIndex, pageSize, filters, globalFilter])

  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen(p => !p)
    const handle = (action: string) => { console.log(`${action}`, row.original); toggle() }
    const handleView = () => { toggle(); setSelectedId(row.original.usuario_id ?? null); setIsModalOpen(true) }

    return (
      <div className="flex items-center gap-2">
        {!open ? (
          <button className="p-1 hover:text-blue-900" onClick={toggle}>
            <EllipsisVertical className="w-4 h-4 text-blue-700" />
          </button>
        ) : (
          <>
            <button className="p-1 hover:text-green-700" onClick={handleView}><Eye className="w-4 h-4" /></button>
            <button className="p-1 hover:text-blue-500" onClick={() => handle("Editar")}><Edit className="w-4 h-4" /></button>
            <button className="p-1 text-red-600 hover:text-red-900" onClick={() => handle("Excluir")}><Trash2 className="w-4 h-4" /></button>
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
    { accessorKey: "nome", header: () => <span className="font-bold">Nome</span>, cell: ({ getValue }) => <span className="font-semibold text-blue-800">{getValue() as string}</span> },
    { accessorKey: "contato", header: "Contato" },
    { accessorKey: "zonasResponsavel", header: "Zonas Responsáveis", cell: ({ getValue }) => (getValue() as string[]).join(", ") },
    { accessorKey: "localidade", header: "Localidade" },
    {
      accessorKey: "situacao", header: "Situação",
      cell: ({ getValue }) => {
        const s = getValue() as string
        const dot = s === "Ativo" ? "bg-green-500" : s === "Desligado" ? "bg-orange-500" : "bg-gray-400"
        return <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${dot}`} /><span>{s}</span></div>
      }
    },
    { id: "acoes", header: "Ações", cell: ({ row }) => <AcoesCell row={row} />, size: 60 },
  ], [])

  const table = useReactTable({
    data, columns, pageCount: Math.ceil(totalRows / pageSize),
    state: { globalFilter, rowSelection, pagination: { pageIndex, pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: u => {
      const s = typeof u === "function" ? u({ pageIndex, pageSize }) : u
      setPageIndex(s.pageIndex); setPageSize(s.pageSize)
    },
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true, manualPagination: true, manualFiltering: true
  })

  const selectedCount = table.getSelectedRowModel().rows.length
  const allSelected = table.getIsAllPageRowsSelected()
  const toggleAllSelected = () => table.toggleAllPageRowsSelected()

  const renderActionBar = () => selectedCount > 0 && (
    <div className="flex items-center justify-between p-2 mb-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="checkbox" checked={allSelected} onChange={toggleAllSelected} className="h-4 w-4 2xl:w-6 2xl:h-6 rounded border-2 border-blue-600" />
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
    { key: "nome", label: "Nome" },
    { key: "zonasResponsavel", label: "Zona Responsável" },
    { key: "situacao", label: "Situação" },
  ]

  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">
      {selectedCount === 0 && (
        <TabelaFiltro<RowData>
          filtros={filtros} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
          tempFilters={tempFilters} setTempFilters={setTempFilters}
          setFilters={setFilters} uniqueValues={uniqueValues}
          selectedCount={selectedCount} allSelected={allSelected} toggleAllSelected={toggleAllSelected}
        />
      )}
      {renderActionBar()}
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

      <ModalDetalhes<Agente>
        id={selectedId} endpoint="/usuarios" open={isModalOpen} onOpenChange={setIsModalOpen}
        campos={["nome_completo", "email", "telefone_ddd", "telefone_numero", "estado", "municipio", "situacao_atual", "setor_de_atuacao"]}
        renderField={(field, value) => {
          const labels: Record<string, string> = {
            nome_completo: "Nome", email: "E-mail", telefone_ddd: "DDD", telefone_numero: "Número de Telefone",
            estado: "Estado", municipio: "Município", situacao_atual: "Situação Atual", setor_de_atuacao: "Setor de Atuação"
          }
          if (field === "setor_de_atuacao" && Array.isArray(value))
            return (
              <div><strong>{labels[field]}:</strong>
                <ul className="list-disc ml-5">
                  {value.map((v, i) => (
                    <li key={i}>
                      <span className="font-semibold text-blue-700">{v.setor}</span>
                      {v.bairro && <div className="ml-4 font-semibold text-gray-700">Bairro: {v.bairro}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          if (field === "situacao_atual")
            return <div><strong>{labels[field]}:</strong> {value ? "Ativo" : "Desligado"}</div>
          return (
            <div><strong>{labels[field] ?? String(field)}:</strong> {value == null ? "Não informado" : Array.isArray(value) ? value.join(", ") : String(value)}</div>
          )
        }}
      />
    </Card>
  )
}

export default Index
