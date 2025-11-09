import { useState } from "react"
import { toast } from "react-toastify"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, FileText, Loader2, Check, ClipboardPlus } from "lucide-react"
import api from "@/services/api"

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

const DEFAULT_TIPOS_IMOVEL = ["Residencial", "Comercial", "Terreno", "Equipamento Público"]

// Helpers para CEP
const onlyDigits = (v: string) => (v || "").replace(/\D/g, "")
const formatCep = (v: string) => {
  const d = onlyDigits(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export default function FormsDenunciaDialog({
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
  const [files, setFiles] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)

  // CEP
  const [cep, setCep] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)

  function updateField<K extends keyof DenunciaForm>(key: K, value: DenunciaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function buscarCep() {
    const d = onlyDigits(cep)
    if (d.length !== 8) return
    try {
      setBuscandoCep(true)
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`)
      const data = await res.json()
      if (!res.ok || data?.erro) {
        toast.error("CEP não encontrado.")
        return
      }
      if (typeof data?.bairro === "string" && data.bairro.trim()) {
        setForm((prev) => ({ ...prev, bairro: data.bairro }))
      } else {
        toast.warn("CEP sem bairro definido.")
      }
      // Preencher logradouro se vier do CEP e o campo ainda estiver vazio
      if (typeof data?.logradouro === "string" && data.logradouro.trim()) {
        setForm((prev) => ({
          ...prev,
          logradouro: prev.logradouro.trim() ? prev.logradouro : data.logradouro,
        }))
      }
    } catch {
      toast.error("Falha ao buscar CEP.")
    } finally {
      setBuscandoCep(false)
    }
  }

  function validarCampos(): string | null {
    if (!form.logradouro.trim()) return "Informe o logradouro."
    if (!form.numero.trim()) return "Informe o número do imóvel."
    if (!/^\d+$/.test(form.numero.trim())) return "Informe um número do imóvel válido (apenas dígitos)."
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

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const data_denuncia = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const hora_denuncia = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    const numero = parseInt(form.numero.trim(), 10)

    const basePayload = {
      rua_avenida: form.logradouro.trim(),
      numero,
      bairro: form.bairro.trim(),
      tipo_imovel: form.tipoImovel.trim(),
      data_denuncia,
      hora_denuncia,
      observacoes: evidencia.trim(),
    } as const

    const payload: Record<string, any> = { ...basePayload }
    const complemento = form.complemento.trim()
    if (complemento) payload.endereco_complemento = complemento

    const formData = new FormData()
    formData.append("rua_avenida", form.logradouro.trim())
    formData.append("numero", String(numero))
    formData.append("bairro", form.bairro.trim())
    formData.append("tipo_imovel", form.tipoImovel.trim())
    formData.append("observacoes", evidencia.trim())
    formData.append("data_denuncia", data_denuncia)
    formData.append("hora_denuncia", hora_denuncia)
    if (complemento) formData.append("endereco_complemento", complemento)
    files.forEach((file) => formData.append("files", file))

    try {
      setEnviando(true)
      await api.post("/denuncia", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
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
      setCep("")
      setFiles([])
    } catch (err: any) {
      console.error("Erro ao enviar /denuncia:", err?.response?.data || err)
      const msg = err?.response?.data?.message || "Não foi possível cadastrar a denúncia."
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-20 bg-gradient-to-r from-purple to-purple-dark hover:from-purple-dark hover:to-purple text-white text-xl border-none">
          <ClipboardPlus className="!h-6 !w-6 shrink-0" />
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
                Informe CEP para preencher o bairro automaticamente.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logradouro" className="text-blue-dark">
                Logradouro (Rua/Avenida/etc.)
              </Label>
              <Input
                id="logradouro"
                placeholder="Digite o logradouro"
                className="bg-secondary border-none text-blue-dark"
                value={form.logradouro}
                onChange={(e) => updateField("logradouro", e.target.value)}
              />
            </div>

            {/* Ajustado para 4 colunas: CEP, Número, Bairro, Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cep" className="text-gray-500">
                  CEP
                </Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  className="bg-secondary border-none text-blue-dark"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  onBlur={buscarCep}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur()
                    }
                  }}
                />
                {buscandoCep && (
                  <span className="text-xs text-muted-foreground">Buscando CEP...</span>
                )}
              </div>

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
                  placeholder="Informe o bairro"
                  className="bg-secondary border-none text-blue-dark"
                  value={form.bairro}
                  onChange={(e) => updateField("bairro", e.target.value)}
                  disabled={buscandoCep}
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-gray-500">Tipo de imóvel</Label>
                <Select value={form.tipoImovel} onValueChange={(val) => updateField("tipoImovel", val)}>
                  <SelectTrigger className="w-full bg-secondary border-none text-blue-dark">
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

            <div className="grid gap-2">
              <Label htmlFor="files" className="text-gray-500">
                Anexar evidências (fotos)
              </Label>
              <Input
                id="files"
                type="file"
                multiple
                accept="image/*"
                className="bg-secondary border-none text-blue-dark cursor-pointer"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
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