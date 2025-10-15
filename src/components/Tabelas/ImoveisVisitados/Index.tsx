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
import { parse, format, isValid } from "date-fns"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, EllipsisVertical, Eye, X } from "lucide-react"

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
}

type BackendRow = {
  registro_de_campo_id?: number
  area_de_visita?: { setor?: string; logadouro?: string }
  imovel_complemento?: string
  imovel_numero?: string
  imovel_tipo?: string
  imovel_status?: string
  ciclo?: { ano_de_criacao?: string }
  larvicidas?: { tipo?: string; forma?: string; quantidade?: number }[]
  adulticidas?: { tipo?: string; quantidade?: number }[]
  [k: string]: any
}

function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], status: [], atividade: [] })
  const [tmpFilters, setTmpFilters] = useState({ ...filters })
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [tmpDateRange, setTmpDateRange] = useState<[Date | null, Date | null]>([...dateRange])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const uniqValues = (k: keyof RowData) =>
    Array.from(new Set(data.flatMap((r) => (Array.isArray(r[k]) ? r[k]! : r[k] ? [r[k]!] : [])))).map(String)

  const normalize = (r: BackendRow): RowData => {
    const fmt = (d?: string) => {
      if (!d) return undefined
      const p = parse(d, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date())
      if (isValid(p)) return format(p, "dd/MM/yyyy")
      const iso = new Date(d)
      return isValid(iso) ? format(iso, "dd/MM/yyyy") : undefined
    }
    const safe = (v?: unknown) => (v == null || (typeof v === "string" && !v.trim()) ? "Não informado" : String(v))
    const atividades = Object.entries(r).filter(([_, v]) => typeof v === "boolean" && v).map(([k]) => k.toUpperCase())
    return {
      registro_de_campo_id: r.registro_de_campo_id,
      setor: safe(r.area_de_visita?.setor),
      logradouro: safe(r.area_de_visita?.logadouro),
      numero: safe(r.imovel_numero),
      complemento: safe(r.imovel_complemento),
      tipo: safe(r.imovel_tipo),
      status: safe(r.imovel_status),
      data: fmt(r.ciclo?.ano_de_criacao),
      atividade: atividades.length ? atividades : ["Nenhuma"],
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await api.get("/registro_de_campo", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        })
        const resp = res.data
        const all: RowData[] = Array.isArray(resp) ? resp.map((r: BackendRow) => normalize(r)) : []
        // filtro global
        let filtered = globalFilter
          ? all.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(globalFilter.toLowerCase())))
          : all
        // filtros por campo
        for (const [k, vals] of Object.entries(filters))
          if (vals.length)
            filtered = filtered.filter((r) => {
              const f = r[k as keyof RowData]
              return Array.isArray(f) ? f.some((x) => vals.includes(x)) : vals.includes(String(f))
            })
        // intervalo de datas
        if (dateRange[0] && dateRange[1])
          filtered = filtered.filter((r) => {
            if (!r.data) return false
            const [d, m, y] = r.data.split("/").map(Number)
            const dt = new Date(y, m - 1, d)
            return isValid(dt) && dt >= dateRange[0]! && dt <= dateRange[1]!
          })

        setTotalRegistros(Array.isArray(resp) ? resp.length : 0)
        setTotalRows(filtered.length)
        const start = page.pageIndex * page.pageSize
        setData(filtered.slice(start, start + page.pageSize))
      } catch (e) {
        console.error(e); setError("Erro ao carregar dados do servidor"); setData([])
      } finally { setLoading(false) }
    }
    load()

  }, [page.pageIndex, page.pageSize, filters, dateRange, globalFilter])

  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen((p) => !p)
    return (
      <div className="flex items-center gap-2">
        {!open ? (
          <button className="p-1 hover:text-blue-900" onClick={toggle}><EllipsisVertical className="w-4 h-4 text-blue-700" /></button>
        ) : (
          <>
            <button className="p-1 hover:text-green-700" onClick={() => { toggle(); if (row.original.registro_de_campo_id) { setSelectedId(row.original.registro_de_campo_id); setIsModalOpen(true) } }}><Eye className="w-4 h-4" /></button>
            <button className="p-1 hover:text-blue-500" onClick={() => { console.log("Editar", row.original); toggle() }}><Edit className="w-4 h-4" /></button>
            <button className="p-1 text-red-600 hover:text-red-900" onClick={() => { console.log("Excluir", row.original); toggle() }}><Trash2 className="w-4 h-4" /></button>
            <button className="p-1 hover:text-gray-600" onClick={toggle}><X className="w-4 h-4" /></button>
          </>
        )}
      </div>
    )
  }

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    { accessorKey: "setor", header: "Identificador do Setor" },
    { accessorKey: "complemento", header: "Complemento" },
    { accessorKey: "logradouro", header: "Logradouro" },
    { accessorKey: "numero", header: "N°" },
    { accessorKey: "tipo", header: "Tipo de Imóvel" },
    {
      accessorKey: "status", header: "Status", cell: ({ getValue }) => {
        const s = getValue() as string
        const cls =
          s === "Tratado" ? "bg-green-100 text-green-700 border border-green-700" :
            s === "Visitado" ? "bg-lime-100 text-lime-800 border border-lime-800" :
              s === "Fechado" ? "bg-yellow-100 text-yellow-700 border border-yellow-700" :
                s === "Recusado" ? "bg-red-100 text-red-700 border border-red-700" :
                  "bg-gray-100 text-gray-700 border border-gray-700"
        return <span className={`px-2 py-1 rounded-md text-xs font-semibold ${cls}`}>{s}</span>
      }
    },
    { accessorKey: "data", header: "Data da Visita" },
    { accessorKey: "atividade", header: "Atividades Realizadas" },
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
    { key: "setor", label: "Identificador do setor" },
    { key: "tipo", label: "Tipo de imóvel" },
    { key: "status", label: "Status" },
    { key: "atividade", label: "Atividade Realizada" },
  ]

  const renderField = (field: keyof BackendRow, value: BackendRow[keyof BackendRow]) => {
    const labels: Record<string, string> = {
      registro_de_campo_id: "ID",
      imovel_numero: "Número do imóvel",
      imovel_complemento: "Complemento",
      imovel_tipo: "Tipo de imóvel",
      imovel_status: "Status",
      agente_nome: "Agente responsável",
      area_de_visita_id: "Área de visita",
      larvicidas: "Larvicidas aplicados",
      adulticidas: "Adulticidas aplicados",
      ciclo: "Data da visita",
    }

    if ((field === "larvicidas" || field === "adulticidas") && Array.isArray(value)) {
      const arr = value as { tipo?: string; forma?: string; quantidade?: number }[]
      return (
        <div>
          <strong>{labels[field]}:</strong>
          <ul className="list-disc ml-5">
            {arr.map((v, i) => (
              <li key={i}>
                Tipo: <span className="font-semibold">{v.tipo ?? "Não informado"}</span>
                {v.forma && <> | Forma: <span className="font-semibold">{v.forma}</span></>}
                {v.quantidade !== undefined && <> | Quantidade: <span className="font-semibold">{v.quantidade}</span></>}
              </li>
            ))}
          </ul>
        </div>
      )
    }

    return (
      <div>
        <strong>{labels[field] ?? String(field)}:</strong>{" "}
        {value == null ? "Não informado" : Array.isArray(value) ? (value as any).join(", ") : String(value)}
      </div>
    )
  }

  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">
      <div className="text-fluid-large font-bold text-gray-900 mb-2">Total: {totalRegistros}</div>

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

      <ModalDetalhes<BackendRow>
        id={selectedId}
        endpoint="/registro_de_campo"
        campos={[
          "registro_de_campo_id",
          "imovel_numero",
          "imovel_complemento",
          "imovel_tipo",
          "imovel_status",
          "agente_nome",
          "area_de_visita_id",
          "larvicidas",
          "adulticidas",
        ]}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        renderField={renderField}
      />
    </Card>
  )
}

export default Index
