"use client"

import { useState, useMemo, useEffect } from "react"
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef,
} from "@tanstack/react-table"
import { format, isValid } from "date-fns"
import { Card } from "@/components/ui/card"
import { Edit, Trash2, EllipsisVertical, X } from "lucide-react"
import { api } from "@/services/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"

export type Denuncia = {
  denuncia_id?: number; data_denuncia?: string; hora_denuncia?: string; bairro?: string; rua_avenida?: string
  numero?: number; endereco_complemento?: string; tipo_imovel?: string; observacoes?: string; supervisor_id?: number
  agente_responsavel_id?: number; nome_completo?: string; arquivos?: { arquivo_denuncia_id: number; arquivo_nome: string }[]
  cpf?: string; email?: string; status?: string; endereco_completo?: string
}

export type RowData = {
  id?: number; data?: string; municipio?: string; endereco?: string; agente?: string; status?: string
  tipo_imovel?: string; observacoes?: string; arquivos?: { arquivo_denuncia_id: number; arquivo_nome: string }[]
  supervisor_id?: number; agente_responsavel_id?: number;
}

const fieldLabels: Record<string, string> = {
  data_denuncia: "Data", hora_denuncia: "Hora", bairro: "Bairro", tipo_imovel: "Tipo de Imóvel", rua_avenida: "Rua/Avenida",
  numero: "N°", endereco_complemento: "Complemento", observacoes: "Observações",
  agente_responsavel_id: "Agente Responsável", status: "Status", arquivos: "Arquivos",
}

export default function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ municipio: [], status: [] })
  const [tmpFilters, setTmpFilters] = useState(filters)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [tmpDateRange, setTmpDateRange] = useState(dateRange)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { })
  const [agentesOptions, setAgentesOptions] = useState<{ id: number; nome: string }[]>([])

  const confirmDelete = (action: () => void, desc = "Deseja realmente excluir?") => {
    setConfirmAction(() => action); setConfirmDescription(desc); setConfirmOpen(true)
  }


  useEffect(() => {
    api.get("/usuarios", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` }
    })
      .then(res => {
        console.log("🔍 RESPOSTA DA API /usuarios:", res.data)


        const agentes = res.data.agentes.map((a: any) => {
          const item = {
            id: a.agente_id,
            nome: a.nome_completo
          }
          return item
        })

        setAgentesOptions(agentes)
      })
      .catch(err => {
        console.error("❌ ERRO /usuarios:", err)
      })
  }, [])



  const deletarAreas = async (ids: number[]) => {
    if (!ids.length) return
    try {
      const { data } = await api.delete(`/denuncia/${ids}`)
      return data
    } catch (e: any) {
      const msg: Record<number, string> = {
        400: "Requisição inválida.", 401: "Não autenticado.",
        403: "Acesso proibido.", 404: "Denúncia não encontrada."
      }
      alert(msg[e.response?.status] || "Erro interno."); throw e
    }
  }

  const uniqValues = (key: keyof RowData) =>
    Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await api.get("/denuncia")
        if (res.status !== 200) throw new Error("Erro ao buscar denúncias")

        const denuncias: Denuncia[] = res.data

        const denunciasComEndereco = denuncias.map(d => ({
          ...d,
          endereco_completo: `${d.rua_avenida ?? ""}, ${d.numero ?? ""}`.trim()
        }))

        // Buscar nomes dos agentes
        const rows: RowData[] = await Promise.all(denunciasComEndereco.map(async (d) => {
          let agenteNome = "Não definido"

          if (d.agente_responsavel_id) {
            try {
              const agenteRes = await api.get(`/usuarios/agente/${d.agente_responsavel_id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` }
              })
              agenteNome = agenteRes.data.nome_completo ?? "Não definido"

            } catch {
              agenteNome = "Não definido"
            }
          }

          return {
            id: d.denuncia_id,
            data: d.data_denuncia ? format(new Date(d.data_denuncia), "dd/MM/yyyy") : "Não informado",
            municipio: d.bairro ?? "Não informado",
            endereco_completo: `${d.rua_avenida ?? ""}, ${d.numero ?? ""}`.trim(),
            endereco_complemento: d.endereco_complemento,
            agente: agenteNome,
            status: d.status ?? "Não visitado",
            tipo_imovel: d.tipo_imovel,
            observacoes: d.observacoes,
            arquivos: d.arquivos,
            supervisor_id: d.supervisor_id,
            agente_responsavel_id: d.agente_responsavel_id,
          }
        }))

        // Aplicar filtros e paginação
        let filteredRows = [...rows]

        if (globalFilter) {
          const search = globalFilter.toLowerCase()
          filteredRows = filteredRows.filter(r =>
            Object.values(r).some(v =>
              Array.isArray(v)
                ? v.join(", ").toLowerCase().includes(search)
                : String(v).toLowerCase().includes(search)
            )
          )
        }

        for (const [key, vals] of Object.entries(filters))
          if (vals.length) filteredRows = filteredRows.filter(r => vals.includes(String(r[key as keyof RowData])))

        if (dateRange[0] && dateRange[1])
          filteredRows = filteredRows.filter(r => {
            const [d, m, y] = (r.data ?? "").split("/").map(Number)
            const dt = new Date(y, m - 1, d)
            return isValid(dt) && dt >= dateRange[0]! && dt <= dateRange[1]!
          })

        const start = page.pageIndex * page.pageSize
        setData(filteredRows.slice(start, start + page.pageSize))
        setTotalRows(filteredRows.length)
      } catch {
        setError("Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    })()
  }, [page, filters, dateRange, globalFilter])


  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [open, setOpen] = useState(false)
    return (
      <div className="flex items-center gap-2">
        {!open ? (
          <button className="p-1 hover:text-blue-900" onClick={() => setOpen(true)}>
            <EllipsisVertical className="w-4 h-4 text-blue-700" />
          </button>
        ) : (
          <>
            <button className="p-1 hover:text-green-700" onClick={() => {
              console.log("Clicou na denúncia:", row.original.id);
              setSelectedId(row.original.id ?? null); setIsModalOpen(true); setOpen(false)
            }}>
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-1 text-red-600 hover:text-red-900" onClick={() =>
              confirmDelete(async () => {
                const resp = await deletarAreas([row.original.id!])
                alert(resp.message)
                setData(p => p.filter(d => d.id !== row.original.id))
              }, "Deseja realmente excluir esta área?")
            }>
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

  const columns = useMemo<ColumnDef<RowData>[]>(() => [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "data", header: "Data" },
    { accessorKey: "municipio", header: "Município" },
    {
      accessorKey: "endereco_completo",
      header: () => <span className="font-bold">Endereço</span>,
      cell: ({ row, getValue }) => (
        <span className="font-semibold cursor-pointer hover:underline"
          onClick={() => { setSelectedId(row.original.id ?? null); setIsModalOpen(true) }}>
          {getValue() as string}
        </span>
      )
    },
    { accessorKey: "agente", header: "Agente responsável" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-700">
          {getValue() as string}
        </span>
      )
    },
    { id: "acoes", header: "Ações", cell: ({ row }) => <AcoesCell row={row} /> },
  ], [])

  const table = useReactTable({
    data, columns,
    pageCount: Math.max(1, Math.ceil(totalRows / page.pageSize)),
    state: { globalFilter, pagination: page },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: updater => {
      const s = typeof updater === "function" ? updater(page) : updater
      setPage(s)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, manualFiltering: true,
  })

  const filtros: FiltroConfig<RowData>[] = [
    { key: "data", label: "Intervalo de datas", type: "date" },
    { key: "municipio", label: "Município" },
    { key: "status", label: "Status" },
  ]

  const renderField = (field: keyof Denuncia, value: unknown) =>
    field === "arquivos" && Array.isArray(value)
      ? value.map(a => <div key={a.arquivo_denuncia_id}>{a.arquivo_nome}</div>)
      : <div className="flex flex-col">
        <strong>{fieldLabels[field] ?? field}:</strong> {String(value ?? "Não informado")}
      </div>


  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">
      <TabelaFiltro<RowData>
        filtros={filtros} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
        tempFilters={tmpFilters} setTempFilters={setTmpFilters}
        tempDateRange={tmpDateRange} setTempDateRange={setTmpDateRange}
        setFilters={setFilters} setAppliedDateRange={setDateRange}
        uniqueValues={uniqValues} selectedCount={0} allSelected={false}
        toggleAllSelected={() => { }}
      />

      {loading ? <p className="text-center py-10 text-gray-500">Carregando...</p> :
        error ? <p className="text-center py-10 text-red-600">{error}</p> :
          (<><Tabela table={table} /><TabelaPaginacao<RowData> table={table} /></>)
      }

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirmação</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { confirmAction(); setConfirmOpen(false) }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalDetalhes<Denuncia>
        id={selectedId} endpoint="/denuncia"
        campos={Object.keys(fieldLabels) as (keyof Denuncia)[]}
        open={isModalOpen} editableFields={["agente_responsavel_id"]}
        selectFields={["agente_responsavel_id"]}
        selectOptions={{
          agente_responsavel_id: agentesOptions.map(a => ({ label: a.nome, value: a.id }))
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
          "rua_avenida"


        ]}
        fieldsFullWidth={[

          "observacoes",
          "arquivos",
        ]}
           sendAsJson={false}
      />
    </Card>
  )
}
