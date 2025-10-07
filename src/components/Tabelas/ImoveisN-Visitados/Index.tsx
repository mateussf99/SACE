"use client"

import { useState, useMemo, useEffect } from "react"
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import { Card } from "@/components/ui/card"
import { Edit } from "lucide-react"

export type RowData = {
    setor?: string
    municipio?: string
    logradouro?: string
    bairro?: string
    tipo?: string
    status?: "Não visitado"
    localizacao?: string
}
type BackendRow = Partial<RowData> | null

export default function TabelaNaoVisitados() {

    const [data, setData] = useState<RowData[]>([])
    const [globalFilter, setGlobalFilter] = useState("")
    const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], bairro: [] })
    const [appliedDateRange, setAppliedDateRange] = useState<[Date | null, Date | null]>([null, null])
    const [tempFilters, setTempFilters] = useState({ ...filters })
    const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([...appliedDateRange])
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)


    const [pageIndex, setPageIndex] = useState(0)
    const [pageSize, setPageSize] = useState(10)
    const [totalRows, setTotalRows] = useState(0)
    // ------------------- FUNÇÕES AUXILIARES -------------------

    const sanitize = (r: BackendRow): RowData => {
        const safeString = (v?: unknown) => (typeof v === "string" && v.trim() ? v : "Não informado")
        const validStatus: RowData["status"][] = ["Não visitado"]
        return {
            setor: safeString(r?.setor),
            municipio: safeString(r?.municipio),
            logradouro: safeString(r?.logradouro),
            bairro: safeString(r?.bairro),
            tipo: safeString(r?.tipo),
            status: validStatus.includes(r?.status ?? "" as RowData["status"]) ? r?.status : undefined,
            localizacao: safeString(r?.localizacao),
        }
    }

    const uniqueValues = (key: keyof RowData): string[] =>
        Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

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
            accessorKey: "setor",
            header: () => <span className="font-bold">Identificador do setor</span>,
            cell: ({ getValue }) => (
                <span className="font-semibold">{getValue() as string}</span>
            ),
        },
        { accessorKey: "municipio", header: "Município" },
        {
            accessorKey: "logradouro",
            header: () => <span className="font-bold">Logradouro</span>,
            cell: ({ getValue }) => (
                <span className="font-semibold">{getValue() as string}</span>
            ),
        },
        { accessorKey: "bairro", header: "Bairro" },
        { accessorKey: "tipo", header: "Tipo" },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status: string = row.getValue("status") ?? "Não informado"
                const color =
                    status === "Não visitado" ? "bg-red-100 text-red-700 border border-red-700" :
                        "bg-gray-100 text-gray-700 border  border-gray-700"
                return <span className={`px-2 py-1 rounded-md text-xs font-semibold ${color}`}>{status}</span>
            },
        },
        {
            accessorKey: "localizacao",
            header: "Localização",
            cell: ({ getValue }) => {
                const valor = getValue() as string
                return (
                    <a
                        href={`https://maps.google.com?q=${encodeURIComponent(valor)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 font-semibold hover:text-blue-900"
                    >
                        {valor}
                    </a>
                )
            },
        }, {
            id: "acoes",
            header: "Ações",
            cell: ({ row }) => (
                <button
                    className="p-1  hover:text-blue-500"
                    onClick={() => {
                        // link
                        console.log("Editar Visita", row.original)
                    }}
                >
                    <Edit className="w-4 h-4" />
                </button>
            ),
            size: 40,
        }
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
        if (!["Não visitado"].includes(status)) return
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

    const filtros: FiltroConfig<RowData>[] = [
        { key: "setor", label: "Identificador da área" },
        { key: "bairro", label: "Bairro" },
        { key: "tipo", label: "Tipo" },
    ]

    return (
        <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6">
            <TabelaFiltro<RowData>
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
                    <TabelaPaginacao<RowData> table={table} />
                </>
            )}
        </Card>
    )
}
