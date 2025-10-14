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
import { Edit, Trash2, EllipsisVertical, Eye, X } from "lucide-react"
import { api } from "@/services/api"

import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"

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
}

export type RowData = {
  id?: number
  data?: string
  municipio?: string
  endereco?: string
  agente?: string
  status?: string
  tipo_imovel?: string
  observacoes?: string
  arquivos?: { arquivo_denuncia_id: number; arquivo_nome: string }[]
  supervisor_id?: number
  agente_responsavel_id?: number
}

function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ municipio: [], status: [] })
  const [tmpFilters, setTmpFilters] = useState({ ...filters })
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [tmpDateRange, setTmpDateRange] = useState<[Date | null, Date | null]>([...dateRange])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const uniqValues = (key: keyof RowData) =>
    Array.from(new Set(data.map((r) => r[key]).filter(Boolean))).map(String)

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get("/denuncia")
        if (res.status !== 200) throw new Error("Erro ao buscar denúncias")
        let rows: RowData[] = res.data.map((d: Denuncia) => ({
          id: d.denuncia_id,
          data: d.data_denuncia ? format(new Date(d.data_denuncia), "dd/MM/yyyy") : "Não informado",
          municipio: d.bairro ?? "Não informado",
          endereco: `${d.rua_avenida ?? ""}, ${d.numero ?? ""} ${d.endereco_complemento ?? ""}`.trim(),
          agente: d.nome_completo ?? "Não informado",
          status: "Não visitado",
          tipo_imovel: d.tipo_imovel,
          observacoes: d.observacoes,
          arquivos: d.arquivos,
          supervisor_id: d.supervisor_id,
          agente_responsavel_id: d.agente_responsavel_id,
        }))

        if (globalFilter) {
          const search = globalFilter.toLowerCase()
          rows = rows.filter((r) =>
            Object.values(r).some((v) =>
              Array.isArray(v) ? v.join(", ").toLowerCase().includes(search) : String(v).toLowerCase().includes(search)
            )
          )
        }

        for (const [key, vals] of Object.entries(filters))
          if (vals.length) rows = rows.filter((r) => vals.includes(String(r[key as keyof RowData])))

        if (dateRange[0] && dateRange[1])
          rows = rows.filter((r) => {
            const [d, m, y] = (r.data ?? "").split("/").map(Number)
            const dt = new Date(y, m - 1, d)
            return isValid(dt) && dt >= dateRange[0]! && dt <= dateRange[1]!
          })

        const start = page.pageIndex * page.pageSize
        setData(rows.slice(start, start + page.pageSize))
        setTotalRows(rows.length)
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [page.pageIndex, page.pageSize, filters, dateRange, globalFilter])

  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
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
            <button className="p-1 hover:text-green-700" onClick={() => { toggle(); if (row.original.id) { setSelectedId(row.original.id); setIsModalOpen(true) } }}>
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-blue-500" onClick={() => { console.log("Editar", row.original); toggle() }}>
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-1 text-red-600 hover:text-red-900" onClick={() => { console.log("Excluir", row.original); toggle() }}>
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
    { accessorKey: "data", header: "Data" },
    { accessorKey: "municipio", header: "Município" },
    { accessorKey: "endereco", header: () => <span className="font-bold">Endereço</span>, cell: ({ getValue }) => <span className="font-semibold text-gray-700">{getValue() as string}</span> },
    { accessorKey: "agente", header: "Agente responsável" },
    { accessorKey: "status", header: "Status" },
    { id: "acoes", header: "Ações", cell: ({ row }) => <AcoesCell row={row} />, size: 60 },
  ], [])

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.max(1, Math.ceil(totalRows / page.pageSize)),
    state: { globalFilter, rowSelection, pagination: { pageIndex: page.pageIndex, pageSize: page.pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const s = typeof updater === "function" ? updater({ pageIndex: page.pageIndex, pageSize: page.pageSize }) : updater
      setPage({ pageIndex: s.pageIndex, pageSize: s.pageSize })
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
    { key: "municipio", label: "Município" },
    { key: "status", label: "Status" },
  ]

  const renderField = (field: keyof Denuncia, value: any) => {
    const labels: Record<string, string> = {
      denuncia_id: "ID",
      data_denuncia: "Data",
      hora_denuncia: "Hora",
      bairro: "Bairro",
      rua_avenida: "Rua / Avenida",
      numero: "Número",
      endereco_complemento: "Complemento",
      tipo_imovel: "Tipo de Imóvel",
      observacoes: "Observações",
      nome_completo: "Agente Responsável",
      arquivos: "Arquivos",
    }
    if (field === "arquivos" && Array.isArray(value))
      return value.map((a) => <div key={a.arquivo_denuncia_id}>{a.arquivo_nome}</div>)
    return (
      <div>
        <strong>{labels[field] ?? String(field)}:</strong> {String(value ?? "Não informado")}
      </div>
    )
  }

  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">
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
        <div className="text-center py-10 text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">{error}</div>
      ) : (
        <>
          <Tabela table={table} />
          <TabelaPaginacao<RowData> table={table} />
        </>
      )}

      <ModalDetalhes<Denuncia>
        id={selectedId}
        endpoint="/denuncia"
        campos={[
          "denuncia_id",
          "data_denuncia",
          "hora_denuncia",
          "bairro",
          "rua_avenida",
          "numero",
          "endereco_complemento",
          "tipo_imovel",
          "observacoes",
          "nome_completo",
          "arquivos",
        ]}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        renderField={renderField}
      />
    </Card>
  )
}

export default Index
