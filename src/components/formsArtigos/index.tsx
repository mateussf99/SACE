import { useState } from "react"
import { toast } from "react-toastify"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SquareChartGantt, Loader2, Check, Newspaper, Link2, Image as ImageIcon } from "lucide-react"
import api from "@/services/api"

type ArtigoForm = {
  titulo: string
  descricao: string
  link_artigo: string
}

type Props = {
  defaultOpen?: boolean
  onFinish?: (artigo: ArtigoForm & { imagem?: File | null }) => Promise<void> | void
}

function isValidHttpUrl(v: string) {
  try {
    const u = new URL(v)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export default function FormsArtigoDialog({ defaultOpen, onFinish }: Props) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [form, setForm] = useState<ArtigoForm>({
    titulo: "",
    descricao: "",
    link_artigo: "",
  })
  const [imagem, setImagem] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  function updateField<K extends keyof ArtigoForm>(key: K, value: ArtigoForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validarCampos(): string | null {
    if (!form.titulo.trim()) return "Informe o título do artigo."
    if (!form.descricao.trim()) return "Informe a descrição do artigo."
    if (!form.link_artigo.trim()) return "Informe o link do artigo."
    if (!isValidHttpUrl(form.link_artigo.trim())) return "Informe um link válido (http/https)."
    return null
  }

  async function handleFinalizar() {
    const erro = validarCampos()
    if (erro) {
      toast.error(erro)
      return
    }

    const formData = new FormData()
    formData.append("titulo", form.titulo.trim())
    formData.append("descricao", form.descricao.trim())
    formData.append("link_artigo", form.link_artigo.trim())
    if (imagem) formData.append("imagem", imagem)

    try {
      setEnviando(true)
      await api.post("/artigo", formData, { headers: { "Content-Type": "multipart/form-data" } })
      await onFinish?.({ ...form, imagem })
      toast.success("Artigo cadastrado com sucesso.")
      setOpen(false)
      setForm({ titulo: "", descricao: "", link_artigo: "" })
      setImagem(null)
    } catch (err: any) {
      console.error("Erro ao enviar /artigo:", err?.response?.data || err)
      const msg = err?.response?.data?.message || "Não foi possível cadastrar o artigo."
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-20   bg-gradient-to-r from-white to-white hover:from-white hover:to-gray-400 text-blue-darck text-xl  ">
          <SquareChartGantt className="!h-6 !w-6 shrink-0" />
          Cadastrar artigo
        </Button>
      </DialogTrigger>

      <DialogContent
        className="bg-white border-none sm:max-w-[720px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Novo artigo</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <section className="grid gap-4">
            <div>
              <h3 className="flex items-center gap-1 text-md font-medium text-blue-dark">
                <Newspaper className="h-4 w-4" />
                Informações básicas
              </h3>
              <p className="text-xs text-muted-foreground">
                Preencha os campos obrigatórios para publicar o artigo.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="titulo" className="text-blue-dark">
                Título
              </Label>
              <Input
                id="titulo"
                placeholder="Digite o título do artigo"
                className="bg-secondary border-none text-blue-dark"
                value={form.titulo}
                onChange={(e) => updateField("titulo", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao" className="text-blue-dark">
                Descrição
              </Label>
              <Textarea
                id="descricao"
                placeholder="Uma breve descrição sobre o conteúdo do artigo"
                className="bg-secondary border-none text-blue-dark h-24 resize-none overflow-y-auto"
                value={form.descricao}
                onChange={(e) => updateField("descricao", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="link_artigo" className="text-blue-dark flex items-center gap-1">
                <Link2 className="h-4 w-4" /> Link do artigo
              </Label>
              <Input
                id="link_artigo"
                type="url"
                placeholder="https://exemplo.com/artigo-completo"
                className="bg-secondary border-none text-blue-dark"
                value={form.link_artigo}
                onChange={(e) => updateField("link_artigo", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Link externo para o conteúdo completo do artigo.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imagem" className="text-blue-dark flex items-center gap-1">
                <ImageIcon className="h-4 w-4" /> Imagem de capa (opcional)
              </Label>
              <Input
                id="imagem"
                type="file"
                accept="image/*"
                className="bg-secondary border-none text-blue-dark cursor-pointer"
                onChange={(e) => setImagem((e.target.files && e.target.files[0]) || null)}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="w-full bg-blue-dark text-white hover:bg-blue"
            onClick={handleFinalizar}
            disabled={enviando}
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Publicar artigo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}