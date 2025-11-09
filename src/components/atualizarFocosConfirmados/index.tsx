"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { toast } from "react-toastify"

type RegistroDeCampo = {
  registro_de_campo_id: number
  imovel_numero: string
  imovel_lado: string
  imovel_tipo: string
  formulario_tipo: string
  numero_da_amostra?: string | null
  quantiade_tubitos?: number | null
  agente_id: number
  caso_confirmado?: boolean
  area_de_visita?: {
    bairro?: string
    cep?: string
    estado?: string
    logadouro?: string
    municipio?: string
    setor?: string
  }
}

type ConfirmarCasosModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agenteId: number
}

export function ConfirmarCasosModal({
  open,
  onOpenChange,
  agenteId,
}: ConfirmarCasosModalProps) {
  const [registros, setRegistros] = useState<RegistroDeCampo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [initialSelected, setInitialSelected] = useState<Record<number, boolean>>({})

  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!open) return

    const fetchRegistros = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data } = await api.get<RegistroDeCampo[]>("/registro_de_campo")

        const filtrados = data.filter(r => r.agente_id === agenteId)

        setRegistros(filtrados)

        const initial: Record<number, boolean> = {}
        filtrados.forEach(r => {
          initial[r.registro_de_campo_id] = r.caso_confirmado === true
        })

        setInitialSelected(initial)
        setSelected(initial)
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ??
          "Erro ao carregar registros. Tente novamente."
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }

    fetchRegistros()
  }, [open, agenteId])

  const handleToggle = (id: number, value: boolean) => {
    setSelected(prev => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)

    try {
      const idsParaConfirmar = registros
        .map(r => r.registro_de_campo_id)
        .filter(id => selected[id] && !initialSelected[id])

      if (idsParaConfirmar.length === 0) {
        toast.info("Nenhuma alteração para salvar.")
        return
      }

      await Promise.all(
        idsParaConfirmar.map(id => api.put(`/casos_confirmado/${id}`)),
      )

      setInitialSelected(selected)
      toast.success("Casos atualizados com sucesso.")
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        "Erro ao atualizar casos. Tente novamente."
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setSelected(initialSelected)
    setError(null)
    onOpenChange(false)
  }

  const filteredRegistros = registros.filter(r => {
    const q = search.toLowerCase()

    return (
      r.imovel_numero?.toLowerCase().includes(q) ||
      r.imovel_lado?.toLowerCase().includes(q) ||
      r.imovel_tipo?.toLowerCase().includes(q) ||
      r.formulario_tipo?.toLowerCase().includes(q) ||
      r.numero_da_amostra?.toLowerCase().includes(q) ||
      r.area_de_visita?.logadouro?.toLowerCase().includes(q) ||
      r.area_de_visita?.setor?.toLowerCase().includes(q) ||
      r.area_de_visita?.bairro?.toLowerCase().includes(q)
    )
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="
          w-[90vw] md:min-w-[70vw] max-w-[1200px] min-w-[180px]
          max-h-[85vh]
          bg-white border-none p-0
          flex flex-col
          rounded-2xl shadow-lg overflow-hidden
          text-blue-dark
        "
      >
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-blue-dark/10 bg-white">
          <DialogTitle className="text-lg font-semibold text-blue-dark">
            Atualizar focos confirmados
          </DialogTitle>
          <DialogDescription className="text-sm text-blue-dark">
            Selecione os imóveis com resultado laboratorial de focos confirmados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto px-6 py-4 bg-white">
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="
              w-full px-3 py-2
              rounded-md
              bg-secondary border-none
              text-sm text-blue-dark
              focus:outline-none focus:ring-2 focus:ring-blue-dark
            "
          />

          {loading && (
            <div className="flex items-center justify-center py-8 text-blue-dark">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando registros...</span>
            </div>
          )}

          {!loading && error && (
            <Card className="p-3 text-sm text-red-700 bg-red-50 border border-red-200">
              {error}
            </Card>
          )}

          {!loading && !error && filteredRegistros.length === 0 && (
            <Card className="p-3 text-sm bg-secondary border-none text-blue-dark">
              Nenhum registro encontrado.
            </Card>
          )}

          {!loading && !error && filteredRegistros.length > 0 && (
            <Card className="flex-1 mt-2 border border-blue-dark/10 bg-white shadow-sm">
              <div className="overflow-auto">
                <Table className="min-w-[700px]  md:min-w-[900px]  text-xs">
                  <TableHeader className="sticky top-0 bg-secondary z-10">
                    <TableRow>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Nº imóvel
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Lado
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Formulário
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Nº amostra
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Qtde tubitos
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Logradouro
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Setor
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold">
                        Bairro
                      </TableHead>
                      <TableHead className="text-blue-dark text-xs font-semibold w-[200px]">
                        Resultado
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRegistros.map(r => {
                      const id = r.registro_de_campo_id
                      const hasSample =
                        typeof r.numero_da_amostra === "string" &&
                        r.numero_da_amostra.trim().length > 0

                      return (
                        <TableRow key={id} className="text-blue-dark text-xs">
                          <TableCell>{r.imovel_numero}</TableCell>
                          <TableCell>{r.imovel_lado}</TableCell>
                          <TableCell>{r.formulario_tipo}</TableCell>
                          <TableCell>{r.numero_da_amostra || "-"}</TableCell>
                          <TableCell>{r.quantiade_tubitos ?? "-"}</TableCell>
                          <TableCell>{r.area_de_visita?.logadouro ?? "-"}</TableCell>
                          <TableCell>{r.area_de_visita?.setor ?? "-"}</TableCell>
                          <TableCell>{r.area_de_visita?.bairro ?? "-"}</TableCell>
                          <TableCell>
                            <label className="inline-flex items-center gap-2 text-blue-dark">
                              <input
                                type="checkbox"
                                className={`
                                  h-4 w-4
                                  ${!hasSample ? "opacity-50 cursor-not-allowed" : ""}
                                `}
                                disabled={!hasSample}
                                checked={!!selected[id]}
                                onChange={e =>
                                  hasSample && handleToggle(id, e.target.checked)
                                }
                              />
                              <span className="text-xs italic">
                                {hasSample
                                  ? "Confirmar"
                                  : "Sem amostra para análise"}
                              </span>
                            </label>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Rodapé com botões */}
          <div className="flex justify-end gap-2 pt-3 border-t border-blue-dark/10 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="border-none bg-secondary text-blue-dark hover:bg-secondary/80"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={saving || loading}
              onClick={handleConfirm}
              className="bg-emerald-600 text-white hover:bg-emerald-700 pb-2"
            >
              {saving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
