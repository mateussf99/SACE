import {useState, useEffect} from "react"
import { MapPin, Trash2, Plus, Check, Loader2 } from "lucide-react"

// Ajuste os paths dos componentes shadcn/ui conforme seu projeto
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

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

type Setor = { id: string; label: string }

type Props = {
  setores?: Setor[]
  defaultOpen?: boolean
  onFinish?: (enderecos: Endereco[]) => Promise<void> | void
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]

const DEFAULT_SETORES: Setor[] = [
  { id: "setor-1", label: "Microrregião A/Setor A/Nome 0" },
  { id: "setor-2", label: "Microrregião B/Setor B/Nome 1" },
  { id: "setor-3", label: "Microrregião C/Setor C/Nome 2" },
]

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "")
}
function formatCep(v: string) {
  const d = onlyDigits(v).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export default function FormsAreasDialog({ setores = DEFAULT_SETORES, defaultOpen, onFinish }: Props) {
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
  }, [cep]) // eslint-disable-line react-hooks/exhaustive-deps

  function validarCampos(): string | null {
    if (!onlyDigits(cep)) return "Informe um CEP válido."
    if (!setorId) return "Selecione o identificador do setor."
    if (!quarteirao) return "Informe o Nº do quarteirão."
    if (!uf) return "Selecione o estado (UF)."
    if (!municipio.trim()) return "Informe o município."
    if (!bairro.trim()) return "Informe o bairro."
    if (!logradouro.trim()) return "Informe o logradouro."
    return null
  }

  function handleAddEndereco() {
    const erro = validarCampos()
    if (erro) {
      window.alert(erro)
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

    // Mantém CEP e Setor/Quarteirão; limpa campos de texto do endereço
    setBairro("")
    setLogradouro("")
  }

  function handleRemove(id: string) {
    setEnderecos((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleFinalizar() {
    if (enderecos.length === 0) {
      window.alert("Adicione pelo menos um endereço.")
      return
    }
    setEnviando(true)
    try {
      if (onFinish) {
        await onFinish(enderecos)
      } else {
        // Ajuste a URL da sua API aqui
        const resp = await fetch("/api/areas-visita", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enderecos }),
        })
        if (!resp.ok) throw new Error("Falha ao enviar os endereços.")
      }
      window.alert("Endereços enviados com sucesso!")
      setEnderecos([])
      setOpen(false)
    } catch (e: any) {
      window.alert(e?.message || "Erro ao finalizar o cadastro.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog  open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar áreas de visita
        </Button>
      </DialogTrigger>

      <DialogContent
        className="bg-white border-none sm:max-w-[660px] "
        onInteractOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}   
      >
        <DialogHeader>
          <DialogTitle>Cadastrar áreas de visita</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* CEP */}
          <div className="grid gap-2">
            <Label className="text-blue-dark" htmlFor="cep">Informe o CEP para facilitar a busca pelos endereços de visita</Label>
            <div className="relative">
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
          </div>

          {/* Setor + Quarteirão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-500">Selecionar Identificador do setor</Label>
              <Select value={setorId} onValueChange={setSetorId}>
                <SelectTrigger className="bg-secondary border-none w-full">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent className="bg-white border-none">
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-500" htmlFor="quarteirao">Nº Quarteirão</Label>
              <Input
                id="quarteirao"
                placeholder="001"
                className="bg-secondary border-none text-blue-dark w-full"
                value={quarteirao}
                onChange={(e) => setQuarteirao(e.target.value)}
              />
            </div>
          </div>

          {/* UF + Município + Bairro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
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
                <div className="">
                    <Label className="text-gray-500" htmlFor="municipio">Município</Label>
                    <Input
                        id="municipio"
                        placeholder="Município"
                        className="bg-secondary border-none text-blue-dark"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                    />
                </div>
                <div className="gap-2">
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

          <Separator />

          {/* Lista de Endereços cadastrados */}
          <div className="grid gap-2">
            <Label className="text-gray-500">Endereços cadastrados</Label>
            <div className="rounded-md border-none">
              <ScrollArea  className="bg-secondary border-none h-40">
                {enderecos.length === 0 ? (
                  <div className="flex h-40 border-none rounded-md texte-blue-dark items-center justify-center text-sm text-muted-foreground">
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
        </div>

        <DialogFooter className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            className="w-full "
          >
            {enviando ? (
              <>
                <Loader2 className=" mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Finalizar cadastro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}