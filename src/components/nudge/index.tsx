import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, Loader2, Pencil, Send, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import api from '@/services/api'

export type Nudge = {
  nudges_id: number
  titulo: string
  descricao: string
  url?: string | null
}

// Lista que busca /nudges e faz o map
export default function Nudges() {
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchNudges() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/nudges')
      // aceita payload plano ou paginado (data.data)
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      setNudges(list)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Falha ao carregar nudges.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNudges()
  }, [])

  function handleUpdated(updated: Nudge) {
    setNudges(prev => prev.map(n => (n.nudges_id === updated.nudges_id ? updated : n)))
  }

  function handleDeleted(id: number) {
    setNudges(prev => prev.filter(n => n.nudges_id !== id))
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">Carregando nudges...</div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-red-600">{error}</span>
        <Button size="sm" onClick={fetchNudges}>Tentar novamente</Button>
      </div>
    )
  }

  if (!nudges.length) {
    return (
      <div className="text-sm text-gray-600">Nenhum nudge cadastrado.</div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {nudges.map(n => (
        <NudgeCard
          key={n.nudges_id}
          nudge={n}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  )
}

// Card individual (agora export nomeado)
export function NudgeCard({ nudge, onUpdated, onDeleted, onSend }: {
  nudge: Nudge
  onUpdated?: (n: Nudge) => void
  onDeleted?: (id: number) => void
  onSend?: (id: number) => Promise<void> | void
}) {
  const [expanded, setExpanded] = useState(false)

  // edição
  const [editOpen, setEditOpen] = useState(false)
  const [titulo, setTitulo] = useState(nudge.titulo)
  const [descricao, setDescricao] = useState(nudge.descricao)
  const [url, setUrl] = useState(nudge.url || '')
  const [salvando, setSalvando] = useState(false)

  // exclusão
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [apagando, setApagando] = useState(false)

  // envio
  const [enviando, setEnviando] = useState(false)

  function validar(): string | null {
    if (!titulo.trim()) return 'Informe o título.'
    if (!descricao.trim()) return 'Informe a descrição.'
    if (url.trim()) {
      try {
        const u = new URL(url.trim())
        if (!/^https?:$/.test(u.protocol)) return 'A URL deve começar com http ou https.'
      } catch {
        return 'Informe uma URL válida.'
      }
    }
    return null
  }

  async function handleSalvarEdicao() {
    const erro = validar()
    if (erro) return toast.error(erro)

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      url: url.trim() || null,
    }

    setSalvando(true)
    try {
      const { data } = await api.put(`/nudges/${nudge.nudges_id}`, payload)
      toast.success('Nudge atualizado.')
      onUpdated?.(data ?? { ...nudge, ...payload })
      setEditOpen(false)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Falha ao atualizar nudge.'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    setApagando(true)
    try {
      await api.delete(`/nudges/${nudge.nudges_id}`)
      toast.success('Nudge excluído.')
      onDeleted?.(nudge.nudges_id)
      setDeleteOpen(false)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Falha ao excluir nudge.'
      toast.error(msg)
    } finally {
      setApagando(false)
    }
  }

  async function handleEnviar() {
    setEnviando(true)
    try {
      if (onSend) {
        await onSend(nudge.nudges_id)
      } else {
        await api.post(`/nudges/${nudge.nudges_id}/send`)
      }
      toast.success('Nudge enviado.')
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Falha ao enviar nudge.'
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((prev) => !prev) }}
        className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-blue-dark font-semibold truncate">{nudge.titulo}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{nudge.descricao}</p>
            {nudge.url ? (
              <a
                href={nudge.url}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {nudge.url}
              </a>
            ) : null}
          </div>
        </div>

        {expanded && (
          <div
            className="mt-4 grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              onClick={() => { setTitulo(nudge.titulo); setDescricao(nudge.descricao); setUrl(nudge.url || ''); setEditOpen(true) }}
              className="justify-center"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="default"
              onClick={handleEnviar}
              disabled={enviando}
              className="justify-center"
            >
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
            <Button
                variant="destructive"
              onClick={() => setDeleteOpen(true)}
              className="justify-center"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        )}
      </div>

      {/* Dialogo de edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border-none sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Nudge</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-gray-500" htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                className="bg-secondary border-none text-blue-dark"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-gray-500" htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                className="bg-secondary border-none text-blue-dark h-28 min-h-28 max-h-44 resize-none overflow-y-auto"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-gray-500" htmlFor="url">URL (opcional)</Label>
              <Input
                id="url"
                className="bg-secondary border-none text-blue-dark"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setEditOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button className="w-full" onClick={handleSalvarEdicao} disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo de confirmação de exclusão */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Excluir nudge</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir este nudge? Essa ação não pode ser desfeita.
          </p>
          <DialogFooter className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setDeleteOpen(false)} disabled={apagando}>
              Cancelar
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleExcluir} disabled={apagando}>
              {apagando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
