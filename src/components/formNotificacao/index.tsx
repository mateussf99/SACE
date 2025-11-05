import { useState } from 'react'
import { BellPlus, Check, Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// ATENÇÃO: mover para o backend/variável de ambiente para não expor a chave no cliente
const PUSHALERT_API = "https://api.pushalert.co/rest/v1/send"
const PUSHALERT_KEY = "a37a011f18d88c3c636a0f5bc5d0cf37"

type Props = {
  defaultOpen?: boolean
  onFinish?: (payload: { title: string; message: string; url?: string }) => Promise<void> | void
}

export default function FormNotificacaoDialog({ defaultOpen = false, onFinish }: Props) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [url, setUrl] = useState("")
  const [enviando, setEnviando] = useState(false)

  // limpa o formulário
  function resetForm() {
    setTitle("")
    setMessage("")
    setUrl("")
    setEnviando(false)
  }

  function validar(): string | null {
    if (!title.trim()) return "Informe o título."
    if (!message.trim()) return "Informe a mensagem."
    if (url.trim()) {
      try {
        // valida URL simples
        const u = new URL(url.trim())
        if (!/^https?:$/.test(u.protocol)) return "A URL deve começar com http ou https."
      } catch {
        return "Informe uma URL válida."
      }
    }
    return null
  }

  async function handleEnviar() {
    const erro = validar()
    if (erro) {
      toast.error(erro)
      return
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      url: url.trim() || undefined,
    }

    setEnviando(true)
    try {
      // PushAlert espera application/x-www-form-urlencoded e Authorization com api_key
      const body = new URLSearchParams()
      body.set("title", payload.title)
      body.set("message", payload.message)
      if (payload.url) body.set("url", payload.url)

      const resp = await fetch(PUSHALERT_API, {
        method: "POST",
        headers: {
          "Authorization": `api_key=${PUSHALERT_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      })

      const data = await resp.json().catch(() => null as any)
      if (!resp.ok || (data && data.success === false)) {
        const msg = data?.message || data?.error || `Falha ao enviar notificação. (HTTP ${resp.status})`
        throw new Error(msg)
      }

      toast.success("Notificação enviada com sucesso!")
      if (onFinish) await onFinish(payload)

      // limpa e fecha
      setTitle("")
      setMessage("")
      setUrl("")
      setOpen(false)
    } catch (err: any) {
      const msg = err?.message || "Falha ao enviar notificação."
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button
              variant='default'
              size='lg'
              className='w-full h-15 bg-gradient-to-r from-blue to-blue-dark hover:from-blue-dark hover:to-blue text-white text-xl border-none'
              aria-label='Enviar notificações para a população'
            >
              <BellPlus className='mr-1 !h-6 !w-6 shrink-0' />
              Enviar notificações para a população
            </Button>
      </DialogTrigger>

      <DialogContent
        className="bg-white border-none sm:max-w-[600px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Novo Alerta de Risco</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="text-gray-500" htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Novo Alerta de Risco"
              className="bg-secondary border-none text-blue-dark"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-gray-500" htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Um novo caso de dengue foi confirmado na sua área."
              className="bg-secondary border-none text-blue-dark h-28 min-h-28 max-h-28 resize-none overflow-y-auto"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-gray-500" htmlFor="url">URL (opcional)</Label>
            <Input
              id="url"
              placeholder="https://seu-app.com/alertas/123"
              className="bg-secondary border-none text-blue-dark"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => { resetForm(); setOpen(false); }}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleEnviar}
            disabled={enviando || !title.trim() || !message.trim()}
            className="w-full"
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}