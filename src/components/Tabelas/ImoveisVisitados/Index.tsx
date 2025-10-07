"use client"

import { useState, useMemo, useEffect } from "react"
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table"
import { parse, format, isValid } from "date-fns"
import { X } from "lucide-react"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import { Card } from "@/components/ui/card"
import type { Table } from "@tanstack/react-table"

export type RowData = {
  setor?: string
  logradouro?: string
  numero?: string | number
  complemento?: string
  tipo?: string
  status?: "Inspecionado" | "Recusado" | "Fechado"
  data?: string
  atividade?: string
}

type BackendRow = Partial<RowData> | null

export default function TabelaImoveisVisitados() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], status: [], atividade: [] })
  const [appliedDateRange, setAppliedDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [tempFilters, setTempFilters] = useState({ ...filters })
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([...appliedDateRange])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [showSelectionHeader, setShowSelectionHeader] = useState(true)


  const sanitize = (r: BackendRow): RowData => {
    const parseDate = (d?: string) => {
      if (!d) return undefined
      const parsed = parse(d, "dd/MM/yyyy", new Date())
      if (isValid(parsed)) return format(parsed, "dd/MM/yyyy")
      const iso = new Date(d)
      return isValid(iso) ? format(iso, "dd/MM/yyyy") : undefined
    }
    const safeString = (v?: unknown) => (typeof v === "string" && v.trim() ? v : "Não informado")
    const safeNumber = (v?: unknown) =>
      typeof v === "number" ? (Number.isNaN(v) ? "Não informado" : v) :
        typeof v === "string" && v.trim() ? v : "Não informado"
    const validStatus: RowData["status"][] = ["Inspecionado", "Recusado", "Fechado"]
    return {
      setor: safeString(r?.setor),
      logradouro: safeString(r?.logradouro),
      numero: safeNumber(r?.numero),
      complemento: safeString(r?.complemento),
      tipo: safeString(r?.tipo),
      status: validStatus.includes(r?.status ?? "" as RowData["status"]) ? r?.status : undefined,
      data: parseDate(r?.data),
      atividade: safeString(r?.atividade),
    }
  }

  const uniqueValues = (key: keyof RowData): string[] =>
    Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  const renderSelectionHeader = (
    selectedCount: number,
    allSelected: boolean,
    toggleAllSelected: () => void,
    updateStatus: (status: string) => void,
    table: Table<RowData>,
    showSelectionHeader: boolean,
    setShowSelectionHeader: (b: boolean) => void
  ) => {
    if (selectedCount === 0 || !showSelectionHeader) return null

    return (
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 justify-between w-full">
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="p-1 border-2 border-dashed border-blue-600 rounded flex items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAllSelected}
                className="h-3 w-3 rounded border-2 border-blue-600"
              />
            </span>
            <span className="text-responsive2 font-medium text-blue-600">
              {allSelected ? "Desmarcar todos" : "Marcar todos"}
            </span>
          </label>

          <div className="flex items-center gap-1">
            <span className="text-responsive2 font-medium">Alterar Status:</span>
            <select
              className="border rounded px-2 sm:px-4 py-1"
              onChange={e => updateStatus(e.target.value)}
            >
              {["Inspecionado", "Recusado", "Fechado"].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="p-1 text-gray-500 hover:text-gray-800 font-bold"
          onClick={() => {
            table.resetRowSelection()
            setShowSelectionHeader(false)
          }}
        >
          <X className="w-6 h-6 text-gray-800 hover:text-black" />
        </button>
      </div>
    )
  }
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams({
          page: String(pageIndex + 1),
          pageSize: String(pageSize),
          globalFilter,
          ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v.join(",")])),
          dataStart: appliedDateRange[0]?.toISOString() ?? "",
          dataEnd: appliedDateRange[1]?.toISOString() ?? "",
        })
        
        const response = await fetch(`/api/imoveis?${queryParams.toString()}`)
        if (!response.ok) throw new Error("Falha ao carregar os dados")
        const json: { rows: BackendRow[]; total: number } = await response.json()
        
        setData(json.rows.filter((r): r is NonNullable<BackendRow> => r !== null).map(sanitize))
        setTotalRows(json.total)

      } catch (err) {
        console.error(err)
        setError("Erro ao carregar dados")
        setData([])
        setTotalRows(0)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [pageIndex, pageSize, filters, appliedDateRange, globalFilter])

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-2 border-blue-600"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-2 border-blue-600"
        />
      ),
      size: 40,
    },
    { accessorKey: "setor", header: "Identificador do setor" },
    { accessorKey: "complemento", header: "Complemento" },
    {
      accessorKey: "logradouro",
      header: () => <span className="font-bold">Logradouro</span>,
      cell: ({ getValue }) => (
        <span className="font-semibold">{getValue() as string}</span>
      ),
    },
    { accessorKey: "numero", header: "N°" },
    { accessorKey: "tipo", header: "Tipo de imóvel" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status: string = row.getValue("status") ?? "Não informado"
        const color =
          status === "Inspecionado" ? "bg-green-100 text-green-700 border border-green-700" :
            status === "Recusado" ? "bg-red-100 text-red-700 border border-red-700" :
              status === "Fechado" ? "bg-yellow-100 text-yellow-700 border border-yellow-700" :
                "bg-gray-100 text-gray-700 border  border-gray-700"
        return <span className={`px-2 py-1 rounded-md text-xs font-semibold ${color}`}>{status}</span>
      },
    },
    {
      accessorKey: "data",
      header: "Data da Visita",
      filterFn: (row, id, filterValue: [Date | null, Date | null]) => {
        if (!filterValue?.[0] || !filterValue[1]) return true
        const cellValue = row.getValue(id)
        if (!cellValue || typeof cellValue !== "string") return false
        let cellDate = parse(cellValue, "dd/MM/yyyy", new Date())
        if (!isValid(cellDate)) cellDate = new Date(cellValue)
        return isValid(cellDate) ? cellDate >= filterValue[0]! && cellDate <= filterValue[1]! : false
      },
    },
    { accessorKey: "atividade", header: "Atividade" },
  ], [])

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRows / pageSize),
    state: { globalFilter, rowSelection, pagination: { pageIndex, pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: updater => {
      const state = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater
      setPageIndex(state.pageIndex)
      setPageSize(state.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true,
  })

  const selectedCount = table.getSelectedRowModel().rows.length
  const allSelected = table.getIsAllPageRowsSelected()
  const toggleAllSelected = () => table.toggleAllPageRowsSelected()

  const updateStatus = async (status: string) => {
    if (!["Inspecionado", "Recusado", "Fechado"].includes(status)) return
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) return

    try {
      const payload = selectedRows.map(r => ({ setor: r.original.setor, status }))
      const response = await fetch('/api/imoveis/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Falha ao atualizar status no backend")
      selectedRows.forEach(r => r.original.status = status as RowData["status"])
      table.resetRowSelection()
    } catch (err) {
      console.error(err)
      alert("Erro ao atualizar o status no servidor")
    }
  }

  useEffect(() => {
    const hasSelectedRows = Object.values(rowSelection).some(Boolean)
    if (hasSelectedRows) setShowSelectionHeader(true)
  }, [rowSelection])

  const filtros: FiltroConfig<RowData>[] = [
    { key: "data", label: "Intervalo de datas", type: "date" },
    { key: "setor", label: "Identificador da área" },
    { key: "tipo", label: "Tipo de imóvel" },
    { key: "status", label: "Status" },
    { key: "atividade", label: "Atividade" },
  ]

  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6">
      {renderSelectionHeader(selectedCount, allSelected, toggleAllSelected, updateStatus, table, showSelectionHeader, setShowSelectionHeader)}

      <TabelaFiltro
        filtros={filtros}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        tempFilters={tempFilters}
        setTempFilters={setTempFilters}
        tempDateRange={tempDateRange}
        setTempDateRange={setTempDateRange}
        setFilters={setFilters}
        setAppliedDateRange={setAppliedDateRange}
        uniqueValues={uniqueValues}
        selectedCount={selectedCount}
        allSelected={allSelected}
        toggleAllSelected={toggleAllSelected}
        updateStatus={updateStatus}
      />

      {loading ? (
        <div className="text-center py-10 text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">{error}</div>
      ) : (
        <>
          <Tabela table={table} />
          <TabelaPaginacao table={table} />
        </>
      )}
    </Card>
  )
}
