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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Edit2, Plus, Save, X, Loader2 } from "lucide-react"
import { usePeriod } from "@/contexts/PeriodContext"
import { Card } from "../ui/card"

type DoencaConfirmada = {
  doenca_confirmada_id: number
  nome?: string
  tipo_da_doenca: string
  rua: string
  numero?: string
  bairro: string
  ciclo_id?: number
  ciclo?: number
  ano?: number
}

type NovaDoenca = {
  nome: string
  tipo_da_doenca: string
  rua: string
  numero: string
  bairro: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const vazio: NovaDoenca = {
  nome: "",
  tipo_da_doenca: "",
  rua: "",
  numero: "",
  bairro: "",
}

type AreaDeVisita = {
  area_de_visita_id: number
  bairro: string
  cep: string
  estado: string
  logadouro: string
  municipio: string
  numero_quarteirao: number
  setor: string
  agentes?: {
    agente_id: number
    nome: string
    situacao_atual: boolean
  }[]
}

type CasoParaDenuncia = {
  nome?: string
  tipo_da_doenca: string
  rua: string
  numero?: string
  bairro: string
}

type ResAreaDenuncias = {
  areas_de_visitas: AreaDeVisita[]
  denuncias: any[]
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()


async function criarDenunciaAutomaticamente(
  caso: CasoParaDenuncia,
  token: string,
  agenteResponsavelId?: number,
) {
  const hoje = new Date()
  const dataDenuncia = hoje.toISOString().slice(0, 10) 
  const horaDenuncia = hoje.toTimeString().slice(0, 8) 

  const formData = new FormData()

  formData.append("rua_avenida", caso.rua)

  const numeroInt = Number(caso.numero || "0")
  formData.append("numero", String(Number.isNaN(numeroInt) ? 0 : numeroInt))

  formData.append("bairro", caso.bairro)
  formData.append("tipo_imovel", "Residencial")
  formData.append("endereco_complemento", "")

  formData.append("data_denuncia", dataDenuncia)
  formData.append("hora_denuncia", horaDenuncia)

  formData.append(
    "observacoes",
    `Denúncia gerada automaticamente a partir de um caso confirmado: ${caso.tipo_da_doenca}${
      caso.nome ? ` - ${caso.nome}` : ""
    }`,
  )

  

  // se tiver agente escolhido, envia como responsável
  if (agenteResponsavelId != null) {
    formData.append("agente_responsavel_id", String(agenteResponsavelId))
  }

  await api.post("/denuncia", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  })
}

async function escolherAgenteMenosSobrecarregado(
  area: AreaDeVisita,
  token: string,
  cacheDenunciasPorAgente: Map<number, number>,
): Promise<number | null> {
  const agentesAtivos = (area.agentes ?? []).filter(a => a.situacao_atual)

  if (!agentesAtivos.length) return null

  const resultados = await Promise.all(
    agentesAtivos.map(async agente => {

      if (cacheDenunciasPorAgente.has(agente.agente_id)) {
        return {
          agente_id: agente.agente_id,
          total: cacheDenunciasPorAgente.get(agente.agente_id)!,
        }
      }

      try {
        const { data } = await api.get<ResAreaDenuncias>(
          `/area_de_visita_denuncias/${agente.agente_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        const denuncias = Array.isArray(data?.denuncias) ? data.denuncias : []
        const total = denuncias.length

        cacheDenunciasPorAgente.set(agente.agente_id, total)

        return {
          agente_id: agente.agente_id,
          total,
        }
      } catch (e) {
        console.error("Erro ao buscar denúncias do agente", agente.agente_id, e)
        return {
          agente_id: agente.agente_id,
          total: Number.POSITIVE_INFINITY,
        }
      }
    }),
  )


  let escolhido = resultados[0]
  for (const r of resultados) {
    if (r.total < escolhido.total) {
      escolhido = r
    }
  }

  if (escolhido.total === Number.POSITIVE_INFINITY) return null
  return escolhido.agente_id
}

export default function DoencasConfirmadasModal({ open, onOpenChange }: Props) {
  const [lista, setLista] = useState<DoencaConfirmada[]>([])
  const [loadingLista, setLoadingLista] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
   const { year: anoSelecionado, cycle: cicloSelecionado } = usePeriod() 


  const [novas, setNovas] = useState<NovaDoenca[]>([vazio])
  const [salvandoBatch, setSalvandoBatch] = useState(false)

  const [editando, setEditando] = useState<DoencaConfirmada | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [deletandoId, setDeletandoId] = useState<number | null>(null)


  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    const carregar = async () => {
      setLoadingLista(true)
      setErro(null)
      try {
        const { data } = await api.get<DoencaConfirmada[]>("/doencas_confirmadas", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}`,
          },
        })
        setLista(Array.isArray(data) ? data : [])
      } catch (e: any) {
        console.error(e)
        setErro(
          e?.response?.status === 401
            ? "Sessão expirada ou não autenticado."
            : "Erro ao carregar doenças confirmadas.",
        )
      } finally {
        setLoadingLista(false)
      }
    }
    carregar()
  }, [open])

  const handleNovaChange = (index: number, campo: keyof NovaDoenca, valor: string) => {
    setNovas(prev => {
      const clone = [...prev]
      clone[index] = { ...clone[index], [campo]: valor }
      return clone
    })
  }

  const adicionarLinha = () => setNovas(prev => [...prev, { ...vazio }])

  const removerLinha = (index: number) => {
    setNovas(prev => (prev.length === 1 ? [vazio] : prev.filter((_, i) => i !== index)))
  }

  const handleSalvarBatch = async () => {
    const payload: CasoParaDenuncia[] = novas
      .map(n => ({
        nome: n.nome?.trim() || undefined,
        tipo_da_doenca: n.tipo_da_doenca.trim(),
        rua: n.rua.trim(),
        numero: n.numero?.trim() || undefined,
        bairro: n.bairro.trim(),
      }))
      .filter(n => n.tipo_da_doenca && n.rua)

    if (!payload.length) {
      alert("Preencha ao menos um registro com 'tipo_da_doenca' e 'rua'.")
      return
    }

    const token = localStorage.getItem("auth_token") ?? ""

    try {
      setSalvandoBatch(true)

      const { data } = await api.post("/doencas_confirmadas", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      alert(data?.message ?? "Registros criados com sucesso.")


      let areas: AreaDeVisita[] = []
      try {
        const resAreas = await api.get<AreaDeVisita[]>("/area_de_visita", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        areas = Array.isArray(resAreas.data) ? resAreas.data : []
      } catch (e) {
        console.error("Erro ao carregar áreas de visita para denúncias automáticas:", e)
      }

      const cacheDenunciasPorAgente = new Map<number, number>()

      await Promise.all(
        payload.map(async caso => {
          let agenteId: number | null = null

          if (areas.length > 0) {
            const bairroNormalizado = normalizar(caso.bairro)
            const ruaNormalizada = normalizar(caso.rua)

            let area = areas.find(a => normalizar(a.bairro) === bairroNormalizado)

            if (!area) {
              area = areas.find(a => normalizar(a.logadouro) === ruaNormalizada)
            }

            if (!area) {
              console.warn(
                "Nenhuma área de visita encontrada para o caso confirmado; criando denúncia sem agente responsável:",
                caso,
              )
            } else {
              try {
                agenteId = await escolherAgenteMenosSobrecarregado(
                  area,
                  token,
                  cacheDenunciasPorAgente,
                )
              } catch (e) {
                console.error(
                  "Erro ao escolher agente com menos denúncias para o caso confirmado:",
                  caso,
                  e,
                )
              }
            }
          } else {
            console.warn(
              "Nenhuma área de visita carregada; criando denúncia sem agente responsável:",
              caso,
            )
          }

          try {
            await criarDenunciaAutomaticamente(caso, token, agenteId ?? undefined)
          } catch (e: any) {
            console.error(
              "Erro ao criar denúncia automática para o caso confirmado:",
              caso,
            )

            if (e?.response) {
              console.error("Status:", e.response.status)
              console.error("Body:", e.response.data)
            } else {
              console.error(e)
            }
          }
        }),
      )

      const resLista = await api.get<DoencaConfirmada[]>("/doencas_confirmadas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setLista(resLista.data ?? [])
      setNovas([vazio])
    } catch (e: any) {
      console.error(e)
      const status = e?.response?.status
      const msg: Record<number, string> = {
        400: "Requisição inválida. Verifique os campos obrigatórios.",
        401: "Não autenticado.",
        403: "Apenas supervisores podem criar registros.",
        409: "Nenhum ciclo ativo encontrado para associar os registros.",
      }
      alert(msg[status] || "Erro ao criar registros de doenças confirmadas.")
    } finally {
      setSalvandoBatch(false)
    }
  }

  const iniciarEdicao = (item: DoencaConfirmada) => setEditando({ ...item })

  const handleEditarCampo = (campo: keyof DoencaConfirmada, valor: string) => {
    setEditando(prev => (prev ? { ...prev, [campo]: valor } : prev))
  }

  const salvarEdicao = async () => {
    if (!editando) return
    const id = editando.doenca_confirmada_id
    const payload = {
      nome: editando.nome?.trim() || undefined,
      tipo_da_doenca: editando.tipo_da_doenca.trim(),
      rua: editando.rua.trim(),
      numero: editando.numero?.trim() || undefined,
      bairro: editando.bairro.trim(),
    }
    if (!payload.tipo_da_doenca || !payload.rua) {
      alert("Campos 'tipo_da_doenca' e 'rua' são obrigatórios.")
      return
    }

    try {
      setSalvandoEdicao(true)
      const { data } = await api.put(`/doencas_confirmadas/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}`,
        },
      })
      alert(data?.message ?? "Registro atualizado com sucesso.")
      setLista(prev =>
        prev.map(item =>
          item.doenca_confirmada_id === id ? { ...item, ...payload } : item,
        ),
      )
      setEditando(null)
    } catch (e: any) {
      console.error(e)
      const status = e?.response?.status
      const msg: Record<number, string> = {
        400: "Requisição inválida. Verifique os campos obrigatórios.",
        401: "Não autenticado.",
        403: "Apenas supervisores podem atualizar registros.",
        404: "Registro não encontrado.",
      }
      alert(msg[status] || "Erro ao atualizar registro.")
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const deletarRegistro = async (id: number) => {
    setDeletandoId(id)
    try {
      const { data } = await api.delete(`/doencas_confirmadas/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}`,
        },
      })
      setLista(prev => prev.filter(item => item.doenca_confirmada_id !== id))
      if (editando?.doenca_confirmada_id === id) setEditando(null)

      setFeedbackMsg({
        type: "success",
        text: data?.message ?? "Registro deletado com sucesso.",
      })
    } catch (e: any) {
      console.error(e)
      const status = e?.response?.status
      const msg: Record<number, string> = {
        401: "Não autenticado.",
        403: "Apenas supervisores podem deletar registros.",
        404: "Registro não encontrado.",
      }
      setFeedbackMsg({
        type: "error",
        text: msg[status] || "Erro ao deletar registro.",
      })
    } finally {
      setDeletandoId(null)
      setConfirmDeleteId(null)
      setTimeout(() => setFeedbackMsg(null), 3000)
    }
  }

  const fechar = () => {
    setEditando(null)
    setNovas([vazio])
    onOpenChange(false)
  }


const listaFiltrada = lista.filter(item =>
  (cicloSelecionado ? item.ciclo === cicloSelecionado : true) &&
  (anoSelecionado ? item.ano === anoSelecionado : true)
)

  return (
  <>
    {/* 🔹 Modal de confirmação de exclusão */}
    {confirmDeleteId !== null && (
      <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-sm animate-in fade-in duration-150">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Excluir registro?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Essa ação é permanente e removerá o registro selecionado.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletarRegistro(confirmDeleteId!)}
              disabled={deletandoId === confirmDeleteId}
            >
              {deletandoId === confirmDeleteId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* 🔹 Toast */}
    {feedbackMsg && (
      <div
        className={`fixed bottom-5 right-5 px-4 py-2 rounded-md shadow-md text-sm text-white z-[10000] ${
          feedbackMsg.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {feedbackMsg.text}
      </div>
    )}
      <Dialog open={open && confirmDeleteId === null} onOpenChange={fechar}>
        <DialogContent className=" w-full max-h-[90vh] bg-white overflow-y-auto p-0 flex flex-col">
          <DialogHeader className="px-6 pt-4 pb-2 border-b bg-white">
            <DialogTitle>Doenças confirmadas</DialogTitle>
            <DialogDescription>
              Visualize e gerencie os registros de doenças confirmadas.
            </DialogDescription>
          </DialogHeader>

          <Card className=" px-3 py-4 space-y-6 bg-white border-none">
            {/* 1) REGISTROS EXISTENTES */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-800">Registros existentes</h2>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              {loadingLista ? (
                <p className="text-sm text-gray-500">Carregando registros...</p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum registro de doença confirmada encontrado.
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden bg-white">
                  <div className="grid grid-cols-[1fr_1fr_2fr_0.8fr] gap-2 px-3 py-2 bg-gray-50 text-sm font-semibold text-gray-700">
                    <span>Tipo</span>
                    <span>Nome</span>
                    <span>Endereço</span>
                    <span>Ações</span>
                  </div>

                  <div>
                   {listaFiltrada.map(item => (
                      <div key={item.doenca_confirmada_id}>
                        {/* Linha normal */}
                        <div
                          className={`grid grid-cols-[1fr_1fr_2fr_0.8fr] gap-3 px-3 py-2 text-xs border-t items-center ${
                            editando?.doenca_confirmada_id === item.doenca_confirmada_id
                              ? "bg-gray-50"
                              : "bg-white"
                          }`}
                        >
                          <span>{item.tipo_da_doenca}</span>
                          <span>{item.nome || "-"}</span>
                          <span>
                            {item.rua}
                            {item.numero ? `, ${item.numero}` : ""} - {item.bairro}
                          </span>

                          <span className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => iniciarEdicao(item)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              type="button"
                              onClick={() => setConfirmDeleteId(item.doenca_confirmada_id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </span>
                        </div>

                        {/* Linha de edição */}
                        {editando?.doenca_confirmada_id === item.doenca_confirmada_id && (
                          <div className="border border-blue p-3 bg-gray-50 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-semibold text-gray-800">
                                Editar registro #{editando.doenca_confirmada_id}
                              </h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditando(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Nome (opcional)</Label>
                                <Input
                                  value={editando.nome ?? ""}
                                  onChange={e => handleEditarCampo("nome", e.target.value)}
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Tipo da doença *</Label>
                                <Input
                                  value={editando.tipo_da_doenca}
                                  onChange={e =>
                                    handleEditarCampo("tipo_da_doenca", e.target.value)
                                  }
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Rua *</Label>
                                <Input
                                  value={editando.rua}
                                  onChange={e => handleEditarCampo("rua", e.target.value)}
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Número</Label>
                                <Input
                                  value={editando.numero ?? ""}
                                  onChange={e => handleEditarCampo("numero", e.target.value)}
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Bairro *</Label>
                                <Input
                                  value={editando.bairro}
                                  onChange={e => handleEditarCampo("bairro", e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => setEditando(null)}
                              >
                                Cancelar
                              </Button>

                              <Button
                                size="sm"
                                type="button"
                                onClick={salvarEdicao}
                                disabled={salvandoEdicao}
                              >
                                {salvandoEdicao ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3 h-3 mr-1" />
                                    Salvar alterações
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 2) NOVOS REGISTROS (ABAIXO) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  Novo(s) caso(s) confirmado(s)
                </h2>
                <Button variant="outline" size="sm" type="button" onClick={adicionarLinha}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar linha
                </Button>
              </div>

              <div className="space-y-4 ">
                {novas.map((linha, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end border rounded-md px-3 py-3 bg-white"
                  >
                    <div>
                      <Label className="text-xs">Nome (opcional)</Label>
                      <Input
                        value={linha.nome}
                        onChange={e => handleNovaChange(idx, "nome", e.target.value)}
                        placeholder="Nome do paciente"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo da doença *</Label>
                      <Input
                        value={linha.tipo_da_doenca}
                        onChange={e =>
                          handleNovaChange(idx, "tipo_da_doenca", e.target.value)
                        }
                        placeholder="Ex: Dengue, Chikungunya..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rua *</Label>
                      <Input
                        value={linha.rua}
                        onChange={e => handleNovaChange(idx, "rua", e.target.value)}
                        placeholder="Rua / Avenida"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Número</Label>
                      <Input
                        value={linha.numero}
                        onChange={e => handleNovaChange(idx, "numero", e.target.value)}
                        placeholder="Número"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Bairro *</Label>
                      <Input
                        value={linha.bairro}
                        onChange={e => handleNovaChange(idx, "bairro", e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="flex justify-end items-end self-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="mt-5"
                        onClick={() => removerLinha(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleSalvarBatch} disabled={salvandoBatch}>
                  {salvandoBatch ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" /> Salvar registros
                    </>
                  )}
                </Button>
              </div>
            </section>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}
