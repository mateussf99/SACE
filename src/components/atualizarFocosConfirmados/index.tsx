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
    const [success, setSuccess] = useState<string | null>(null)

    const [selected, setSelected] = useState<Record<number, boolean>>({})
    const [initialSelected, setInitialSelected] = useState<Record<number, boolean>>({})

    const [search, setSearch] = useState("")

    useEffect(() => {
        if (!open) return

        const fetchRegistros = async () => {
            setLoading(true)
            setError(null)
            setSuccess(null)

            try {
                const { data } = await api.get<RegistroDeCampo[]>("/registro_de_campo")

                const filtrados = data.filter((r) => r.agente_id === agenteId)

                setRegistros(filtrados)

                const initial: Record<number, boolean> = {}
                filtrados.forEach((r) => {
                    initial[r.registro_de_campo_id] = r.caso_confirmado === true
                })

                setInitialSelected(initial)
                setSelected(initial)
            } catch (err: any) {
                setError(
                    err?.response?.data?.error ??
                    "Erro ao carregar registros. Tente novamente.",
                )
            } finally {
                setLoading(false)
            }
        }

        fetchRegistros()
    }, [open, agenteId])

    const handleToggle = (id: number, value: boolean) => {
        setSelected((prev) => ({
            ...prev,
            [id]: value,
        }))
    }

    const handleConfirm = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const idsParaConfirmar = registros
                .map((r) => r.registro_de_campo_id)
                .filter((id) => selected[id] && !initialSelected[id])

            if (idsParaConfirmar.length === 0) {
                setSuccess("Nenhuma alteração para salvar.")
                return
            }

            await Promise.all(
                idsParaConfirmar.map((id) => api.put(`/casos_confirmado/${id}`)),
            )

            setInitialSelected(selected)
            setSuccess("Casos atualizados com sucesso.")
        } catch (err: any) {
            setError(
                err?.response?.data?.error ??
                "Erro ao atualizar casos. Tente novamente.",
            )
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        setSelected(initialSelected)
        setError(null)
        setSuccess(null)
        onOpenChange(false)
    }

    const filteredRegistros = registros.filter((r) => {
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
                className=" w-[90vw] md:min-w-[75vw] max-w-[1200px] min-w-[180px] max-h-[85vh] bg-white p-2 pt-6  sm:p-4 md:p-6  flex flex-col " >
                <DialogHeader className="space-y-2 text-fluid-large">
                    <DialogTitle className="">
                        Atualizar focos confirmados
                    </DialogTitle>
                    <DialogDescription className="text-fluid-small">
                        Selecione os imóveis com resultado laboratorial de focos confirmados.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto">

                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                    />

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            <span className="text-sm">Carregando registros...</span>
                        </div>
                    )}

                    {!loading && error && (
                        <Card className="p-3 text-sm text-red-600 bg-red-50 border border-red-200">
                            {error}
                        </Card>
                    )}

                    {!loading && !error && filteredRegistros.length === 0 && (
                        <Card className="p-3 text-sm">
                            Nenhum registro encontrado.
                        </Card>
                    )}

                    {!loading && !error && filteredRegistros.length > 0 && (
                        <Card className="flex-1  mt-2  border bg-white shadow-sm">
                            <div className=" overflow-auto">
                                <Table className="min-w-[700px ]md:min-w-[900px] text-fluid-small">
                                    <TableHeader className="sticky top-0 bg-muted z-10 ">
                                        <TableRow>
                                            <TableHead>Nº imóvel</TableHead>
                                            <TableHead>Lado</TableHead>
                                            <TableHead>Formulário</TableHead>
                                            <TableHead>Nº amostra</TableHead>
                                            <TableHead>Qtde tubitos</TableHead>
                                            <TableHead>Logradouro</TableHead>
                                            <TableHead>Setor</TableHead>
                                            <TableHead>Bairro</TableHead>
                                            <TableHead className="w-[230px]">
                                                Resultado
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {filteredRegistros.map((r) => {
                                            const id = r.registro_de_campo_id
                                            const hasSample =
                                                typeof r.numero_da_amostra === "string" &&
                                                r.numero_da_amostra.trim().length > 0

                                            return (
                                                <TableRow key={id}>
                                                    <TableCell>{r.imovel_numero}</TableCell>
                                                    <TableCell>{r.imovel_lado}</TableCell>
                                                    <TableCell>{r.formulario_tipo}</TableCell>
                                                    <TableCell>{r.numero_da_amostra || "-"}</TableCell>
                                                    <TableCell>{r.quantiade_tubitos ?? "-"}</TableCell>
                                                    <TableCell>
                                                        {r.area_de_visita?.logadouro ?? "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.area_de_visita?.setor ?? "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.area_de_visita?.bairro ?? "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <label className="inline-flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className={`
                                  h-4 w-4
                                  ${!hasSample && "opacity-50 cursor-not-allowed"}
                                `}
                                                                disabled={!hasSample}
                                                                checked={!!selected[id]}
                                                                onChange={(e) =>
                                                                    hasSample &&
                                                                    handleToggle(id, e.target.checked)
                                                                }
                                                            />
                                                            <span className="text-fluid-small italic">
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

                    <div className=" flex flex-col gap-2">
  <div className="flex-1 text-fluid-small">
    {!!error && <span className="text-red-600">{error}</span>}
    {!!success && (
      <span className="text-emerald-600">{success}</span>
    )}
  </div>

  <div
    className="
      flex 
      flex-col 
      md:flex-row 
      justify-end 
      gap-2 
      text-fluid-small
    "
  >
    <Button
      type="button"
      variant="outline"
      onClick={handleClose}
      disabled={saving}
      className="w-full md:w-auto"
    >
      Cancelar
    </Button>

    <Button
      type="button"
      disabled={saving || loading}
      onClick={handleConfirm}
      className="w-full md:w-auto pb-2"
    >
      {saving && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      Confirmar alterações
    </Button>
  </div>
</div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
