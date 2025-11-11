import {useState, useEffect} from "react"
import { MapPin, Trash2, Plus, Check, Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import api from "@/services/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Endereco = {
  id: string
  cep: string
  setorId: string
  quarteirao: string
  uf: string
  municipio: string
  bairro: string
  logradouro: string
}

type Props = {
  defaultOpen?: boolean
  onFinish?: (enderecos: Endereco[]) => Promise<void> | void
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]


function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "")
}
function formatCep(v: string) {
  const d = onlyDigits(v).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export default function FormsAreasDialog({ defaultOpen, onFinish }: Props) {
  const [open, setOpen] = useState(!!defaultOpen)

  const [cep, setCep] = useState("")
  

  const [setorId, setSetorId] = useState<string>("")
  const [quarteirao, setQuarteirao] = useState<string>("")
  const [uf, setUf] = useState<string>("AL")
  const [municipio, setMunicipio] = useState<string>("Maceió")
  const [bairro, setBairro] = useState<string>("")
  const [logradouro, setLogradouro] = useState<string>("")

  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [enviando, setEnviando] = useState(false)

  // Busca CEP (ViaCEP) quando tiver 8 dígitos
  useEffect(() => {
    const digits = onlyDigits(cep)
    if (digits.length === 8) {
      fetch(`https://viacep.com.br/ws/${digits}/json/`)
        .then(async (r) => {
          const data = await r.json()
          if (data && !data.erro) {
            setUf(String(data.uf || uf || ""))
            setMunicipio(String(data.localidade || municipio || ""))
            setBairro(String(data.bairro || ""))
            setLogradouro(String(data.logradouro || ""))
          }
        })
        .catch(() => {})

    }
  }, [cep])

  function validarCampos(): string | null {
    if (!onlyDigits(cep)) return "Informe um CEP válido."
    if (!setorId) return "Informe o identificador do setor."
    if (!quarteirao || isNaN(Number(quarteirao))) return "Informe o Nº do quarteirão."
    if (!uf) return "Selecione o estado (UF)."
    if (!municipio.trim()) return "Informe o município."
    if (!bairro.trim()) return "Informe o bairro."
    if (!logradouro.trim()) return "Informe o logradouro."
    return null
  }

  function handleAddEndereco() {
    const erro = validarCampos()
    if (erro) {
      toast.error(erro)
      return
    }
    const novo: Endereco = {
      id: crypto.randomUUID(),
      cep: formatCep(cep),
      setorId,
      quarteirao,
      uf,
      municipio: municipio.trim(),
      bairro: bairro.trim(),
      logradouro: logradouro.trim(),
    }
    setEnderecos((prev) => [novo, ...prev])

  }

  function handleRemove(id: string) {
    setEnderecos((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleFinalizar() {
    if (enderecos.length === 0) {
      toast.error("Adicione ao menos um endereço.")
      return
    }

    const payload = enderecos.map((e) => ({
      cep: e.cep,
      setor: e.setorId,
      numero_quarteirao: Number(e.quarteirao),
      estado: e.uf,
      municipio: e.municipio,
      bairro: e.bairro,
      logadouro: e.logradouro,
    }))

    setEnviando(true)
    try {
      await api.post("/area_de_visita", payload)
      toast.success("Áreas de visita cadastradas com sucesso!")

      // callback opcional
      if (onFinish) await onFinish(enderecos)

      // limpa e fecha
      setEnderecos([])
      setCep("")
      setSetorId("")
      setQuarteirao("")
      setUf("AL")
      setMunicipio("Maceió")
      setBairro("")
      setLogradouro("")
      setOpen(false)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Falha ao cadastrar áreas de visita."
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="h-20 bg-gradient-to-r from-blue to-blue-dark hover:from-blue-dark hover:to-blue text-white text-xl border-none"
        >
          <Plus className="!h-6 !w-6 shrink-0" />
          Cadastrar áreas de visita
        </Button>
      </DialogTrigger>

      <DialogContent
        className="z-50 bg-white border-none w-[95vw] max-w-[95vw] sm:max-w-[760px] p-0 max-h-[90vh] flex flex-col overflow-hidden rounded-lg shadow-xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Cadastrar áreas de visita</DialogTitle>
        </DialogHeader>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
          <section className="grid gap-4">
            {/* CEP */}
            <div className="grid gap-2">
              <Label className="text-blue-dark" htmlFor="cep">
                Informe o CEP para facilitar a busca pelos endereços de visita
              </Label>
              <Input
                id="cep"
                placeholder="00000-000"
                value={formatCep(cep)}
                onChange={(e) => setCep(e.target.value)}
                inputMode="numeric"
                maxLength={9}
                className="bg-secondary pr-10 border-none text-blue-dark"
              />
            </div>

            {/* Setor + Quarteirão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-gray-500" htmlFor="setor">Identificador do setor</Label>
                <Input
                  id="setor"
                  placeholder="Ex.: Setor A 01"
                  className="bg-secondary border-none text-blue-dark w-full"
                  value={setorId}
                  onChange={(e) => setSetorId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-500" htmlFor="quarteirao">Nº Quarteirão</Label>
                <Input
                  id="numero_quarteirao"
                  placeholder="001"
                  className="bg-secondary border-none text-blue-dark w-full"
                  value={quarteirao}
                  onChange={(e) => setQuarteirao(e.target.value)}
                />
              </div>
            </div>

            {/* UF + Município + Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label className="text-gray-500">Estado</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger className="bg-secondary w-full border-none text-blue-dark">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-none">
                    {UFS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-500" htmlFor="municipio">Município</Label>
                <Input
                  id="municipio"
                  placeholder="Município"
                  className="bg-secondary border-none text-blue-dark"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-500" htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  placeholder="Bairro"
                  className="bg-secondary border-none text-blue-dark"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </div>
            </div>

            {/* Logradouro */}
            <div className="grid gap-2">
              <Label className="text-gray-500" htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                placeholder="Logradouro"
                className="bg-secondary border-none text-blue-dark"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </div>

            {/* Lista de Endereços */}
            <div className="grid gap-2">
              <Label className="text-gray-500">Endereços cadastrados</Label>
              <div className="rounded-md">
                <ScrollArea className="bg-secondary border-none h-40">
                  {enderecos.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      Nenhum endereço cadastrado.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {enderecos.map((e) => (
                        <li key={e.id} className="flex items-start gap-3 p-3">
                          <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{e.logradouro}</span>
                              <Badge variant="secondary">{e.bairro}</Badge>
                              <Badge variant="outline">{e.municipio}/{e.uf}</Badge>
                              <Badge variant="secondary">{e.cep}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Setor: {e.setorId} • Qrt.: {e.quarteirao}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(e.id)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 py-4 bg-white shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.05)]">
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={handleAddEndereco}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar novo endereço
            </Button>
            <Button
              type="button"
              onClick={handleFinalizar}
              disabled={enviando || enderecos.length === 0}
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
                  Finalizar cadastro
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}