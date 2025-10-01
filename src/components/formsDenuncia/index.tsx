import { useState } from "react"
import { toast } from "react-toastify"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, FileText, Loader2, Check, ClipboardPlus } from "lucide-react"

type DenunciaForm = {
  logradouro: string
  numero: string
  bairro: string
  tipoImovel: string
  complemento: string
}

type Props = {
  bairros?: string[]
  tiposImovel?: string[]
  defaultOpen?: boolean
  onFinish?: (denuncia: DenunciaForm & { evidencia: string }) => Promise<void> | void
}

const DEFAULT_BAIRROS = ["Ponta Verde", "Pajuçara", "Jatiúca", "Farol"]
const DEFAULT_TIPOS_IMOVEL = ["Residencial", "Comercial", "Terreno", "Equipamento Público"]

export default function FormsDenunciaDialog({
  bairros = DEFAULT_BAIRROS,
  tiposImovel = DEFAULT_TIPOS_IMOVEL,
  defaultOpen,
  onFinish,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [form, setForm] = useState<DenunciaForm>({
    logradouro: "",
    numero: "",
    bairro: "",
    tipoImovel: "",
    complemento: "",
  })
  const [evidencia, setEvidencia] = useState("")
  const [enviando, setEnviando] = useState(false)

  function updateField<K extends keyof DenunciaForm>(key: K, value: DenunciaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validarCampos(): string | null {
    if (!form.logradouro.trim()) return "Informe o logradouro."
    if (!form.numero.trim()) return "Informe o número do imóvel."
    if (!form.bairro.trim()) return "Informe o bairro."
    if (!form.tipoImovel.trim()) return "Selecione o tipo de imóvel."
    if (!evidencia.trim()) return "Descreva a evidência."
    return null
  }

  async function handleFinalizar() {
    const erro = validarCampos()
    if (erro) {
      toast.error(erro)
      return
    }
    try {
      setEnviando(true)
      await onFinish?.({ ...form, evidencia })
      toast.success("Denúncia cadastrada com sucesso.")
      setOpen(false)
      setForm({
        logradouro: "",
        numero: "",
        bairro: "",
        tipoImovel: "",
        complemento: "",
      })
      setEvidencia("")
    } catch (err) {
      console.error(err)
      toast.error("Não foi possível cadastrar a denúncia.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-20 bg-gradient-to-r from-purple to-purple-dark hover:from-purple-dark hover:to-purple text-white text-xl border-none">
          <ClipboardPlus className="mr-1 !h-6 !w-6 shrink-0" />
          Cadastrar denúncias
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white border-none sm:max-w-[720px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Nova denúncia</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <section className="grid gap-4">
            <div>
              <h3 className="flex items-center gap-1 text-md font-medium text-blue-dark">
                <MapPin className="h-4 w-4" />
                Localização da denúncia
              </h3>
              <p className="text-xs text-muted-foreground">
                Preencha com as informações de endereço da denúncia.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logradouro" className="text-blue-dark">
                Logradouro (Rua/Avenida/etc.)
              </Label>
              <Input
                id="logradouro"
                placeholder="Rua do sol"
                className="bg-secondary border-none text-blue-dark"
                value={form.logradouro}
                onChange={(e) => updateField("logradouro", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="numero" className="text-gray-500">
                  Número do imóvel
                </Label>
                <Input
                  id="numero"
                  placeholder="115"
                  className="bg-secondary border-none text-blue-dark"
                  value={form.numero}
                  onChange={(e) => updateField("numero", e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bairro" className="text-gray-500">
                  Bairro
                </Label>
                <Input
                  id="bairro"
                  placeholder={bairros[0] ?? "Informe o bairro"}
                  className="bg-secondary border-none text-blue-dark"
                  value={form.bairro}
                  onChange={(e) => updateField("bairro", e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-gray-500">Tipo de imóvel</Label>
                <Select value={form.tipoImovel} onValueChange={(val) => updateField("tipoImovel", val)}>
                  <SelectTrigger className="bg-secondary border-none text-blue-dark">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-none">
                    {tiposImovel.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="complemento" className="text-gray-500">
                Complemento
              </Label>
              <Textarea
                id="complemento"
                placeholder="Casa de esquina, portão de ferro branco..."
                className="bg-secondary border-none text-blue-dark h-24 resize-none overflow-y-auto"
                value={form.complemento}
                onChange={(e) => updateField("complemento", e.target.value)}
              />
            </div>
          </section>

          <section className="grid gap-4">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-blue-dark" />
              <h3 className="text-md font-medium text-blue-dark">Evidência</h3>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="evidencia" className="text-gray-500">
                Descreva a evidência
              </Label>
              <Textarea
                id="evidencia"
                placeholder="Descreva o que foi observado..."
                className="bg-secondary border-none text-blue-dark h-20 resize-none overflow-y-auto"
                value={evidencia}
                onChange={(e) => setEvidencia(e.target.value)}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" className="w-full bg-blue-dark text-white hover:bg-blue" onClick={handleFinalizar} disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Finalizar denúncia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}