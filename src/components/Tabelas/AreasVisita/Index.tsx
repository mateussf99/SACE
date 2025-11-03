"use client"

import { useState, useMemo, useEffect } from "react"
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, X, EllipsisVertical } from "lucide-react"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"
import { api } from "@/services/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export type RowData = { area_de_visita_id?: number; setor?: string; estado?: string; municipio?: string; logradouro?: string; agente?: string; bairro?: string }
export interface BackendRow extends RowData { cep?: string; logadouro?: string; numero_quarteirao?: number; agentes?: { agente_id?: number; nome?: string; situacao_atual?: boolean }[] }

/** Decodifica o payload do JWT sem libs externas */
function decodeJwtPayload<T = any>(token: string | null): T | null {
  if (!token) return null
  try {
    const [, payloadB64] = token.split(".")
    if (!payloadB64) return null
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

const coerceNum = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}


export default function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({ setor: [], tipo: [], bairro: [] })
  const [tempFilters, setTempFilters] = useState(filters)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 10 })
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [agentesOptions, setAgentesOptions] = useState<{ label: string, value: number }[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { })

  // Lê token e (opcionalmente) nível salvo no LS
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const accessLevelLS = typeof window !== "undefined" ? localStorage.getItem("auth_access_level") : null

  // Decodifica claims do JWT (ex.: agente_id, nivel_de_acesso)
  const payload = useMemo(
    () => decodeJwtPayload<{ agente_id?: number | string; nivel_de_acesso?: string }>(token),
    [token]
  )

  const agenteId = useMemo(() => coerceNum(payload?.agente_id), [payload])
  const accessLevel = useMemo(() => {
    const raw = (payload?.nivel_de_acesso ?? accessLevelLS) as string | undefined
    return raw ? raw.toString().trim().toLowerCase() : null
  }, [payload, accessLevelLS])

  // Política: se for "agente", filtra; caso contrário (supervisor/outros), não filtra
  const mustFilterByAgente = accessLevel === "agente" && agenteId != null
  // Quem pode editar/excluir?
const isAgente = accessLevel === "agente"
const isSupervisor = accessLevel === "supervisor"

// Regra pedida: supervisor pode, agente não
const canEdit = !!isSupervisor
const canDelete = !!isSupervisor


  const fieldLabels: Record<string, string> = {
    setor: "Identificador do Setor", estado: "Estado", municipio: "Município", cep: "CEP", bairro: "Bairro", numero_quarteirao: "Número do Quarteirão",
    logadouro: "Logradouro", logradouro: "Logradouro",
    agentes: "Agente Responsável"
  }

  const normalize = (r: BackendRow): RowData => {
    const safe = (v?: unknown) => (typeof v === "string" && v.trim() ? v : "Não informado")
    return {
      area_de_visita_id: r.area_de_visita_id, setor: safe(r.setor), estado: safe(r.estado), municipio: safe(r.municipio),
      logradouro: safe(r.logradouro ?? r.logadouro), agente: r.agentes?.length ? r.agentes.map(a => a.nome).join(", ") : "Não informado", bairro: safe(r.bairro)
    }
  }

  const confirmDelete = (action: () => void, description = "Deseja realmente excluir?") => {
    setConfirmAction(() => action); setConfirmDescription(description); setConfirmOpen(true)
  }

  const deletarAreas = async (ids: number[]) => {
    if (!ids.length) return
    try {
      const { data } = await api.delete("/area_de_visita", { data: { ids } })
      return data
    } catch (e: any) {
      const msg: Record<number, string> = {
        400: "Requisição inválida. IDs não enviados corretamente.",
        401: "Não autenticado.", 403: "Acesso proibido. Apenas supervisores podem deletar.",
        404: "Uma ou mais áreas de visita não foram encontradas."
      }
      alert(msg[e.response?.status] || "Erro interno do servidor."); throw e
    }
  }

  const uniqueValues = (key: keyof RowData) =>
    key === "agente"
      ? Array.from(new Set(data.flatMap(r => r.agente?.split(", ").map(a => a.trim()) ?? [])))
      : Array.from(new Set(data.map(r => r[key]).filter(Boolean))).map(String)

  useEffect(() => {
    api.get("/usuarios", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` } })
      .then(res => {
        const options = res.data.agentes.map((a: any) => ({
          label: a.nome_completo,
          value: a.agente_id
        }))
        setAgentesOptions(options)
      })
      .catch(err => console.error("Erro ao buscar agentes:", err))
  }, [])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true); setError(null)
      try {
        const { data: res } = await api.get("/area_de_visita", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` } })
        // 3.1) Começamos da lista crua do backend
        let allRaw: BackendRow[] = Array.isArray(res) ? (res as BackendRow[]) : []

        // 3.2) Se for agente, filtra para manter só áreas onde ele aparece em `agentes`
        if (mustFilterByAgente) {
          allRaw = allRaw.filter(item =>
            Array.isArray(item.agentes) &&
            item.agentes.some(a => coerceNum(a?.agente_id) === agenteId)
          )
        }

        // 3.3) Normalização e filtros existentes do seu componente
        let all: RowData[] = allRaw.map(normalize)

        if (globalFilter) {
          const s = globalFilter.toLowerCase()
          all = all.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(s)))
        }
        Object.entries(filters).forEach(([k, vals]) => vals.length && (all = all.filter(r => {
          const val = r[k as keyof RowData]
          return k === "agente" && typeof val === "string"
            ? val.split(", ").some(name => vals.includes(name))
            : vals.includes(String(val))
        })))

        // Paginação
        setTotalRows(all.length)
        const start = page.pageIndex * page.pageSize
        setData(all.slice(start, start + page.pageSize))

      } catch { setError("Erro ao carregar dados"); setData([]) }
      finally { setLoading(false) }
    }
    carregar()
}, [page, filters, globalFilter, token, accessLevel])


 const AcoesCell = ({
  row,
  canEdit,
  canDelete,
  onOpen,
}: {
  row: { original: RowData }
  canEdit: boolean
  canDelete: boolean
  onOpen: (id: number | null) => void
}) => {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(p => !p)
  const ver = () => { toggle(); onOpen(row.original.area_de_visita_id ?? null) }

  return (
    <div className="flex items-center gap-2">
      {!open ? (
        <button className="p-1 hover:text-blue-900" onClick={toggle}>
          <EllipsisVertical className="w-4 h-4 text-blue-700" />
        </button>
      ) : (
        <>
          {/* Editar = abrir modal (o bloqueio de edição é feito no Modal) */}
          <button
            className={"p-1 hover:text-green-700"}
            onClick={canEdit ? ver : () => ver()} // abre mesmo sem permissão, porém só leitura
            title={canEdit ? "Editar" : "Somente leitura"}
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* Excluir só quando permitido */}
          {canDelete && (
            <button
              className="p-1 text-red-600 hover:text-red-900"
              onClick={() =>
                confirmDelete(async () => {
                  try {
                    const resp = await deletarAreas([row.original.area_de_visita_id!])
                    alert(resp.message)
                    setData(p => p.filter(d => d.area_de_visita_id !== row.original.area_de_visita_id))
                    toggle()
                  } catch (e) { console.error(e) }
                }, "Deseja realmente excluir esta área?")
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button className="p-1 hover:text-gray-600" onClick={toggle}>
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}



  const columns = useMemo<ColumnDef<RowData>[]>(() => [
     ...(!isAgente ? [{
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
  } as ColumnDef<RowData>] : []),
    {
      accessorKey: "setor", header: "Identificador do setor", cell: ({ row, getValue }) => (
        <span
          className="font-semibold text-blue-800 cursor-pointer hover:underline"
          onClick={() => {
            setSelectedId(row.original.area_de_visita_id ?? null)
            setIsModalOpen(true)
          }}
        >
          {getValue() as string}
        </span>
      )
    },
    { accessorKey: "estado", header: "Estado" }, { accessorKey: "municipio", header: "Município" },
    { accessorKey: "logradouro", header: "Logradouro", cell: ({ getValue }) => <span className="font-semibold text-gray-700">{getValue() as string}</span> },
    { accessorKey: "agente", header: "Agente responsável" }, { accessorKey: "bairro", header: "Bairro" },
    { id: "acoes", header: "Ações", cell: ({ row }) =>  <AcoesCell
      row={row}
      canEdit={canEdit}
      canDelete={canDelete}
      onOpen={(id) => { setSelectedId(id); setIsModalOpen(true) }}
    />, size: 60 }
  ], [])

  const table = useReactTable({
    data, columns, pageCount: Math.ceil(totalRows / page.pageSize),
    state: { globalFilter, rowSelection, pagination: page },
    onGlobalFilterChange: setGlobalFilter, onRowSelectionChange: setRowSelection,
    onPaginationChange: up => setPage(typeof up === "function" ? up(page) : up),
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true, manualPagination: true, manualFiltering: true
  })

  const selectedCount = table.getSelectedRowModel().rows.length, allSelected = table.getIsAllPageRowsSelected()
  const toggleAllSelected = () => table.toggleAllPageRowsSelected()

const renderBar = () => {
  if (!canDelete) return null
  const selectedCount = table.getSelectedRowModel().rows.length
  const allSelected = table.getIsAllPageRowsSelected()
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center justify-between p-2 mb-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="checkbox" checked={allSelected} onChange={table.getToggleAllPageRowsSelectedHandler()} className="h-4 w-4 rounded border-2 border-blue-600" />
        <span>Selecionar todos</span>
        <button
          className="flex items-center gap-1 p-1 text-red-600 hover:text-red-900"
          onClick={() => {
            const ids = table.getSelectedRowModel().rows.map(r => r.original.area_de_visita_id!).filter(Boolean)
            if (!ids.length) return alert("Selecione ao menos uma área.")
            confirmDelete(async () => {
              try {
                const resp = await deletarAreas(ids); alert(resp.message)
                setData(p => p.filter(d => !ids.includes(d.area_de_visita_id!)))
                table.toggleAllPageRowsSelected(false)
              } catch (e) { console.error(e) }
            }, `Deseja realmente excluir as ${ids.length} áreas selecionadas?`)
          }}
        >
          <Trash2 className="w-4 h-4" /><span>Excluir</span>
        </button>
      </div>
      <button className="p-1 hover:text-gray-700" onClick={() => table.toggleAllPageRowsSelected(false)}>
        <X className="w-6 h-6 text-gray-800 hover:text-black" />
      </button>
    </div>
  )
}


  const getAgenteLabel = (id: number | undefined) => {
    if (!id) return "Não informado";
    const found = agentesOptions.find(a => a.value === id);
    return found ? found.label : id;
  }

  const renderField = (f: keyof BackendRow, v: any) => {
    if (f === "agentes") {
      // Se for array de IDs, transforma em nomes
      const ids = Array.isArray(v) ? v : [v].filter(Boolean);
      const nomes = ids.map((id: number) => getAgenteLabel(id));
      return (
        <div>
          <strong>{fieldLabels[f]}:</strong> {nomes.length ? nomes.join(", ") : "Não informado"}
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <strong>{fieldLabels[f] ?? f}:</strong> {v == null ? "Não informado" : Array.isArray(v) ? v.join(", ") : String(v)}
      </div>
    );
  }
  const handleSubmitCustom = (payload: any) => {
    if (payload.agentes) {
      payload.agentes = payload.agentes.map((item: any) => {

        // ✅ Se já veio com agente_id e nome, mantém como está
        if (item.agente_id && item.nome) {
          return item;
        }

        // ✅ Se veio do Select (label + value)
        if (item.value !== undefined && item.label !== undefined) {
          return {
            agente_id: item.value,
            situacao_atual: true,
          };
        }

        // ❌ Caso inesperado — descarta
        return null;
      }).filter(Boolean); // remove nulls
    }

    return payload;
  };


  return (
    <Card className="space-y-4 min-w-[350px] p-2 lg:p-4 xl:p-6 border-none">

      {selectedCount === 0 && <TabelaFiltro<RowData> filtros={[
        { key: "setor", label: "Identificador da área" }, { key: "bairro", label: "Bairro" }, { key: "agente", label: "Agente responsável" }
      ]} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} tempFilters={tempFilters} setTempFilters={setTempFilters}
        setFilters={setFilters} uniqueValues={uniqueValues} selectedCount={selectedCount} allSelected={allSelected} toggleAllSelected={toggleAllSelected} />}
      {renderBar()}
      {loading ? <div className="text-center py-10 text-gray-500">Carregando...</div> :
        error ? <div className="text-center py-10 text-red-600">{error}</div> :
          <><Tabela table={table} /><TabelaPaginacao<RowData> table={table} /></>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
          <DialogHeader><DialogTitle className="text-lg font-semibold">Confirmação</DialogTitle>
            <DialogDescription className="text-gray-700">{confirmDescription}</DialogDescription></DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" variant="destructive"
              onClick={() => { confirmAction(); setConfirmOpen(false) }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalDetalhes<BackendRow>
        id={selectedId} endpoint="/area_de_visita"
        campos={["setor", "estado", "municipio", "cep", "bairro", "numero_quarteirao", "logadouro", "agentes"]}

        open={isModalOpen} onOpenChange={setIsModalOpen}
        editableFields={["numero_quarteirao", "setor", "logadouro", "bairro"]}
        nomeDoCampo="nome"
        fieldLabels={fieldLabels}
        sendAsJson={true}
        // selectFields={["agentes"]}
        //onBeforeSubmit={handleSubmitCustom}
        selectOptions={{ agentes: agentesOptions }}
        renderField={renderField}
        fieldsTwoColumns={[
          "estado",
          "cep",
          "municipio",
          "bairro",
          "numero_quarteirao",
          "setor",



        ]}
        fieldsFullWidth={[

          "logadouro"
        ]}
          canEdit={canEdit} />
    </Card>
  )
}
