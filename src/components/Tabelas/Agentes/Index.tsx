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
import { Card } from "@/components/ui/card"
import { Edit, Trash2, X, EllipsisVertical } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/services/api"
import Tabela from "@/components/Tabelas/TabelaGenerica/Tabela"
import TabelaFiltro, { type FiltroConfig } from "@/components/Tabelas/TabelaGenerica/Filtro"
import TabelaPaginacao from "@/components/Tabelas/TabelaGenerica/Paginacao"
import ModalDetalhes from "@/components/Tabelas/TabelaGenerica/Modal"

export interface Agente {
  usuario_id?: number
  nome_completo?: string
  email?: string
  registro_do_servidor?: string
  telefone_ddd?: string | number
  telefone_numero?: string
  estado?: string
  municipio?: string
  bairro?: string
  logradouro?: string
  numero?: number | string
  situacao_atual?: boolean
  senha?: string
  setor_de_atuacao?: { setor?: string; bairro?: string }[]
}

export type RowData = {
  nome?: string
  contato?: string
  zonasResponsavel?: string[]
  localidade?: string
  situacao?: "Ativo" | "Desligado" | "Não informado"
  usuario_id?: number
  email?: string
  estado?: string
  municipio?: string
  setor_de_atuacao?: { setor?: string; bairro?: string }[]
}

type SetorAtuacao = { setor?: string; bairro?: string }

const SetorAtuacaoViewer = ({ label, value }: { label: string; value: any }) => {
  const lista = (Array.isArray(value) ? value : []) as SetorAtuacao[]

  return (
    <div>
      <strong>{label}:</strong>
      {lista.length ? (
        <ul className="list-disc ml-5">
          {lista.map((v, i) => (
            <li key={i}>
              <span className="font-semibold text-blue-700">
                {v.setor ?? "Sem setor"}
              </span>
              {v.bairro && (
                <div className="ml-4 font-semibold text-gray-700">
                  Bairro: {v.bairro}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className="ml-1 text-gray-500"> Nenhum setor informado </span>
      )}
    </div>
  )
}

const SetorAtuacaoEditor = ({
  label,
  value,
  onChange,
  setoresOptions,
}: {
  label: string
  value: any
  onChange: (next: any) => void
  setoresOptions: Array<{ value: number; label: string }>
}) => {
  const lista = (Array.isArray(value) ? value : []) as SetorAtuacao[]
  const [novoSetor, setNovoSetor] = useState<string>("")
  const [erro, setErro] = useState<string | null>(null)

  const handleRemove = (index: number) => {
    const updated = lista.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleAdd = () => {
    if (!novoSetor) return

    const id = Number(novoSetor)
    if (!Number.isFinite(id)) return

    const opt = setoresOptions.find(o => o.value === id)
    const nomeSetor = opt?.label ?? novoSetor

    const jaExiste = lista.some(item => (item.setor ?? "").trim() === nomeSetor.trim())
    if (jaExiste) {
      setErro("Este setor já está na lista.")
      return
    }
    setErro(null)

    const novoItem: SetorAtuacao = { setor: nomeSetor }
    onChange([...lista, novoItem])
    setNovoSetor("")
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <strong>{label}:</strong>

      {/* Lista atual */}
      <div className="flex flex-col gap-1">
        {lista.length ? (
          lista.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-1"
            >
              <span className="font-semibold text-blue-800 text-sm">
                {item.setor ?? "Sem setor"}
              </span>

              <button
                type="button"
                className="text-red-600 text-xs hover:text-red-800"
                onClick={() => handleRemove(idx)}
              >
                Remover
              </button>
            </div>
          ))
        ) : (
          <span className="text-sm text-gray-500">Nenhum setor vinculado</span>
        )}
      </div>

      {/* Adicionar novo setor */}
      <div className="flex gap-2 mt-2">
        <select
          className="border border-gray-300 rounded-md px-3 py-2 w-full bg-white focus:ring-2 focus:ring-blue-500"
          value={novoSetor}
          onChange={e => setNovoSetor(e.target.value)}
        >
          <option value="">Selecionar setor...</option>
          {setoresOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
          onClick={handleAdd}
        >
          Adicionar
        </button>
      </div>

      {erro && <span className="text-red-600 text-xs mt-1">{erro}</span>}
    </div>
  )
}

function Index() {
  const [data, setData] = useState<RowData[]>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [filters, setFilters] = useState<Record<string, string[]>>({
    setor: [],
    tipo: [],
    bairro: [],
  })
  const [tempFilters, setTempFilters] = useState(filters)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirm, setConfirm] = useState({
    open: false,
    desc: "",
    action: () => {},
  })
  const [setoresOptions, setSetoresOptions] = useState<
    Array<{ value: number; label: string }>
  >([])

  const confirmDelete = (action: () => void, desc = "Deseja realmente excluir?") =>
    setConfirm({ open: true, desc, action })

  const sanitize = (r: Agente): RowData => ({
    usuario_id: r.usuario_id,
    nome: r.nome_completo?.trim() || "Não informado",
    email: r.email || "Não informado",
    contato: r.telefone_numero ? `(${r.telefone_ddd}) ${r.telefone_numero}` : "Não informado",
    zonasResponsavel: r.setor_de_atuacao?.length
      ? r.setor_de_atuacao.map(s => s.setor || "Não informado")
      : ["Não informado"],
    localidade: r.municipio?.trim() || "Não informado",
    estado: r.estado || "Não informado",
    municipio: r.municipio || "Não informado",
    setor_de_atuacao: r.setor_de_atuacao,
    situacao:
      r.situacao_atual === true
        ? "Ativo"
        : r.situacao_atual === false
        ? "Desligado"
        : "Não informado",
  })

  const handleAgenteSaved = (updated: Agente) => {
    if (!updated?.usuario_id) return

    setData(prev =>
      prev.map(row =>
        row.usuario_id === updated.usuario_id
          ? sanitize(updated)
          : row
      )
    )
  }

  const deletarAreas = async (ids: number[]) => {
    if (!ids.length) return
    try {
      for (const id of ids) {
        await api.delete(`/usuarios/agente/${id}`)
      }
      return { status: "success", message: "Agentes deletados com sucesso." }
    } catch (e: any) {
      const msg: Record<number, string> = {
        400: "Requisição inválida. IDs não enviados corretamente.",
        401: "Não autenticado.",
        403: "Acesso proibido. Apenas supervisores podem deletar.",
        404: "Um ou mais agentes não foram encontrados.",
      }
      alert(msg[e.response?.status] || "Erro interno do servidor.")
      throw e
    }
  }

  const uniqueValues = (key: keyof RowData) =>
    [...new Set(
      key === "zonasResponsavel"
        ? data.flatMap(r => r.zonasResponsavel ?? [])
        : data.map(r => r[key]).filter(Boolean),
    )].map(String)

  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const { data } = await api.get("/area_de_visita", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        })

        const mapa = new Map<number, { value: number; label: string }>()
        data.forEach((a: any) => {
          if (!a?.area_de_visita_id || !a?.setor) return
          if (!mapa.has(a.area_de_visita_id)) {
            mapa.set(a.area_de_visita_id, {
              value: a.area_de_visita_id,
              label: a.setor,
            })
          }
        })

        setSetoresOptions(Array.from(mapa.values()))
      } catch (err) {
        console.error("Erro ao buscar setores:", err)
      }
    }
    fetchSetores()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: resp } = await api.get("/usuarios", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        })

        let all: RowData[] = Array.isArray(resp.agentes) ? resp.agentes.map(sanitize) : []

        if (globalFilter) {
          const s = globalFilter.toLowerCase()
          all = all.filter(r =>
            Object.values(r).some(v =>
              Array.isArray(v)
                ? v.join(", ").toLowerCase().includes(s)
                : String(v).toLowerCase().includes(s),
            ),
          )
        }

        for (const [k, vals] of Object.entries(filters)) {
          if (!vals.length) continue
          all = all.filter(r => {
            const val = r[k as keyof RowData]
            return Array.isArray(val)
              ? typeof val[0] === "string"
                ? (val as string[]).some(v => vals.includes(v))
                : (val as { setor?: string; bairro?: string }[]).some(
                    v => vals.includes(v.setor ?? "") || vals.includes(v.bairro ?? ""),
                  )
              : vals.includes(String(val))
          })
        }

        const start = pageIndex * pageSize
        setData(all.slice(start, start + pageSize))
        setTotalRows(all.length)
      } catch {
        setError("Erro ao carregar dados")
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [pageIndex, pageSize, filters, globalFilter])

  const customViewers = {
    setor_de_atuacao: (args: any) => (
      <SetorAtuacaoViewer label={args.label} value={args.value} />
    ),
    telefone_ddd: ({ data }: any) => {
    const ddd = data?.telefone_ddd ?? ""
    const numero = data?.telefone_numero ?? ""

    const temTelefone = (ddd && String(ddd).trim()) || (numero && String(numero).trim())

    return (
      <div className="flex flex-col">
        <strong>Telefone:</strong>
        {temTelefone ? (
          <span>
            ({ddd}) {numero}
          </span>
        ) : (
          <span>Não informado</span>
        )}
      </div>
    )
  },

  telefone_numero: () => null,

  }

  const handleBeforeSubmitAgente = (payload: Partial<Agente>) => {
    const out: any = { ...payload }

    if (!("senha" in payload) || out.senha === "" || out.senha == null) {
    delete out.senha
  }


    if (Array.isArray(out.setor_de_atuacao)) {
      const nomes = out.setor_de_atuacao
        .map((item: any) => (item?.setor ?? "").trim())
        .filter(Boolean)

      const ids = setoresOptions
        .filter(opt => nomes.includes(String(opt.label).trim()))
        .map(opt => opt.value)

      out.setor_de_atuacao = ids
    }

  
    if (typeof out.situacao_atual !== "boolean") {
      out.situacao_atual = Boolean(out.situacao_atual)
    }


    if (out.telefone_ddd != null) {
      const dddNum = Number(out.telefone_ddd)
      if (Number.isNaN(dddNum)) {
        delete out.telefone_ddd
      } else {
        out.telefone_ddd = dddNum
      }
    }

    if (out.numero != null) {
      const num = Number(out.numero)
      if (Number.isNaN(num)) {
        delete out.numero
      } else {
        out.numero = num
      }
    }


    if (out.senha === "" || out.senha == null) {
      delete out.senha
    }

    return out
  }

  const customEditors = {
    setor_de_atuacao: (args: any) => (
      <SetorAtuacaoEditor
        label={args.label}
        value={args.value}
        onChange={args.onChange}
        setoresOptions={setoresOptions}
      />
    ),
    situacao_atual: (args: any) => (
      <div className="flex flex-col gap-1">
        <strong>{args.label}:</strong>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={Boolean(args.value)}
            onChange={e => args.onChange(e.target.checked)}
          />
          <span className="select-none font-medium">
            {args.value ? "Ativo" : "Desligado"}
          </span>
        </label>
      </div>
    ),
    senha: (args: any) => (
      <div className="flex flex-col gap-1 w-full">
        <strong>{args.label}:</strong>
        <input
          type="password"
          className="border border-gray-300 rounded-md px-3 py-2 w-full bg-white focus:ring-2 focus:ring-blue-500"
          value={args.value ?? ""}
          onChange={e => args.onChange(e.target.value)}
          placeholder="Digite uma nova senha"
        />
        <span className="text-xs text-gray-500">
          Deixe em branco para manter a senha atual.
        </span>
      </div>
    ),
  }

  const AcoesCell = ({ row }: { row: { original: RowData } }) => {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen(p => !p)
    const handleView = () => {
      toggle()
      setSelectedId(row.original.usuario_id ?? null)
      setIsModalOpen(true)
    }

    return (
      <div className="flex items-center gap-2">
        {!open ? (
          <button className="p-1 hover:text-blue-900" onClick={toggle}>
            <EllipsisVertical className="w-4 h-4 text-blue-700" />
          </button>
        ) : (
          <>
            <button className="p-1 hover:text-blue-500" onClick={handleView}>
              <Edit className="w-4 h-4" />
            </button>
            <button
              className="p-1 text-red-600 hover:text-red-900"
              onClick={() =>
                confirmDelete(
                  async () => {
                    try {
                      await deletarAreas([row.original.usuario_id!])
                      setData(p => p.filter(d => d.usuario_id !== row.original.usuario_id))
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
    {
      accessorKey: "nome",
      header: () => <span className="font-bold">Nome</span>,
      cell: ({ row, getValue }) => (
        <span
          className="font-semibold text-blue-800 cursor-pointer hover:underline"
          onClick={() => {
            setSelectedId(row.original.usuario_id ?? null)
            setIsModalOpen(true)
          }}
        >
          {getValue() as string}
        </span>
      ),
    },
    { accessorKey: "contato", header: "Contato" },
    {
      accessorKey: "zonasResponsavel",
      header: "Zonas Responsáveis",
      cell: ({ getValue }) => (getValue() as string[]).join(", "),
    },
    { accessorKey: "localidade", header: "Localidade" },
    {
      accessorKey: "situacao",
      header: "Situação",
      cell: ({ getValue }) => {
        const s = getValue() as string
        const dot =
          s === "Ativo" ? "bg-green-500" : s === "Desligado" ? "bg-orange-500" : "bg-gray-400"
        return (
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${dot}`} />
            <span>{s}</span>
          </div>
        )
      },
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => <AcoesCell row={row} />,
      size: 60,
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRows / pageSize),
    state: { globalFilter, rowSelection, pagination: { pageIndex, pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: u => {
      const s = typeof u === "function" ? u({ pageIndex, pageSize }) : u
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

  const selectedCount = table.getSelectedRowModel().rows.length
  const allSelected = table.getIsAllPageRowsSelected()
  const toggleAllSelected = () => table.toggleAllPageRowsSelected()

  const filtros: FiltroConfig<RowData>[] = [
    { key: "nome", label: "Nome" },
    { key: "zonasResponsavel", label: "Zona Responsável" },
    { key: "situacao", label: "Situação" },
  ]

  const ActionBar = () =>
    selectedCount > 0 && (
      <div className="flex items-center justify-between p-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAllSelected}
            className="h-4 w-4 2xl:w-6 2xl:h-6 rounded border-2 border-blue-600"
          />
          <span>Selecionar todos</span>
          <button
            className="flex items-center gap-1 p-1 text-red-600 hover:text-red-900"
            onClick={() => {
              const ids = table
                .getSelectedRowModel()
                .rows.map(r => r.original.usuario_id!)
                .filter(Boolean)

              if (!ids.length) return alert("Selecione ao menos uma área.")

              confirmDelete(
                async () => {
                  try {
                    await deletarAreas(ids)
                    setData(p => p.filter(d => !ids.includes(d.usuario_id!)))
                    table.toggleAllPageRowsSelected(false)
                  } catch (e) {
                    console.error(e)
                  }
                },
                `Deseja realmente excluir as ${ids.length} áreas selecionadas?`,
              )
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>
        </div>
        <button
          className="p-1 hover:text-gray-700"
          onClick={() => table.toggleAllPageRowsSelected(false)}
        >
          <X className="w-6 h-6 text-gray-800 hover:text-black" />
        </button>
      </div>
    )

  const labels: Record<string, string> = {
    nome_completo: "Nome",
    registro_do_servidor: "Registro do Servidor",
    email: "E-mail",
    telefone_ddd: "DDD",
    telefone_numero: "Número de Telefone",
    estado: "Estado",
    municipio: "Município",
    bairro: "Bairro",
    logradouro: "Logradouro",
    numero: "Número",
    situacao_atual: "Situação Atual",
    senha: "Senha",
    setor_de_atuacao: "Setor de Atuação",
  }

  return (
    <Card className="space-y-4 min-w-[170px] p-2 lg:p-4 xl:p-6 border-none shadow-none">
      {!selectedCount && (
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

      <ActionBar />

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

      <Dialog
        open={confirm.open}
        onOpenChange={o => setConfirm(s => ({ ...s, open: o }))}
      >
        <DialogContent className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirmação</DialogTitle>
            <DialogDescription className="text-gray-700">
              {confirm.desc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirm(s => ({ ...s, open: false }))}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              variant="destructive"
              onClick={() => {
                confirm.action()
                setConfirm(s => ({ ...s, open: false }))
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalDetalhes<Agente>
        id={selectedId}
        endpoint="/usuarios/agente"
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        campos={[
          "nome_completo",
          "registro_do_servidor",
          "email",
          "telefone_ddd",
          "telefone_numero",
          "municipio",
          "estado",
          "bairro",
          "logradouro",
          "numero",
          "situacao_atual",
          "senha",
          "setor_de_atuacao",
        ]}

        editableFields={[
          "email",
          "telefone_ddd",
          "telefone_numero",
          "municipio",
          "bairro",
          "logradouro",
          "numero",
          "situacao_atual",
          "senha",
          "setor_de_atuacao",
        ]}
        selectFields={["situacao_atual"]}
        selectOptions={{
          situacao_atual: [
            { value: true, label: "Ativo" },
            { value: false, label: "Desligado" },
          ],
        }}
        fieldLabels={labels}
        customViewers={customViewers}
        customEditors={customEditors}
        sendAsJson={true}
        onBeforeSubmit={handleBeforeSubmitAgente}
        renderField={(field, value) => {
          const label = labels[field as keyof typeof labels] ?? field

          if (field === "situacao_atual") {
            return (
              <div>
                <strong>{label}:</strong> {value ? "Ativo" : "Desligado"}
              </div>
            )
          }

          if (field === "senha") {
            return (
              <div>
                <strong>{label}:</strong> ••••
              </div>
            )
          }

          return (
            <div className="flex flex-col">
              <strong>{label}:</strong>
              {value == null
                ? "Não informado"
                : Array.isArray(value)
                ? value.join(", ")
                : String(value)}
            </div>
          )
        }}

        fieldsTwoColumns={[
          
          "email",
          "telefone_ddd",
          "telefone_numero",
          "estado",
          "municipio",
          "bairro",
          "logradouro",
          "numero",
          "registro_do_servidor",
          "situacao_atual",
        ]}
        fieldsFullWidth={["senha", "setor_de_atuacao"]}
        onSaved={handleAgenteSaved}
      />
    </Card>
  )
}

export default Index
