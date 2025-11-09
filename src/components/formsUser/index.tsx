import { useState, useRef, useEffect } from "react"
import { User, Trash2, Plus, Check, Loader2, ClipboardList } from "lucide-react"
import { toast } from "react-toastify"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import api from "@/services/api"

type SetorApi = {
  area_de_visita_id: number
  setor: string
}

type Usuario = {
  id: string
  nome: string
  cpf: string
  rg: string
  nascimento: string
  email: string
  ddd: string
  telefone: string
  uf: string
  municipio: string
  bairro: string
  logradouro: string
  numero: string
  funcao: "AGENTE" | "SUPERVISOR"
  senha: string
  setorAtuacao: SetorApi[]
  situacaoAtual: boolean
  registroServidor: string        // novo
  dataAdmissao: string            // novo (YYYY-MM-DD)
}

type Props = {
  defaultOpen?: boolean
  onFinish?: (usuarios: Usuario[]) => Promise<void> | void
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]


function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "")
}
function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}
function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 9) // 8 ou 9 dígitos sem DDD
  if (d.length <= 4) return d
  if (d.length === 8) return `${d.slice(0,4)}-${d.slice(4)}`
  return `${d.slice(0,5)}-${d.slice(5)}`
}
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function FormsUser({ defaultOpen /*, onFinish*/ }: Props) {
  const [open, setOpen] = useState(!!defaultOpen)
  const nomeRef = useRef<HTMLInputElement>(null)

  // Dados pessoais
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [rg, setRg] = useState("")
  const [nascimento, setNascimento] = useState("")

  // Contato e endereço
  const [email, setEmail] = useState("")
  const [ddd, setDdd] = useState("")
  const [telefone, setTelefone] = useState("")
  const [uf, setUf] = useState<string>("AL")
  const [municipio, setMunicipio] = useState<string>("")
  const [bairro, setBairro] = useState<string>("")
  const [logradouro, setLogradouro] = useState<string>("")
  const [numero, setNumero] = useState<string>("")

  // Dados profissionais
  const [funcao, setFuncao] = useState<"" | "AGENTE" | "SUPERVISOR">("")
  const [senha, setSenha] = useState<string>("")
  const [confirmarSenha, setConfirmarSenha] = useState<string>("")
  const [situacaoAtual, setSituacaoAtual] = useState<boolean>(true)
  const [registroServidor, setRegistroServidor] = useState<string>("") // novo
  const [dataAdmissao, setDataAdmissao] = useState<string>("")         // novo

  // Setores (via API)
  const [setorOptions, setSetorOptions] = useState<SetorApi[]>([])
  const [carregandoSetores, setCarregandoSetores] = useState(false)
  const [setoresSelecionados, setSetoresSelecionados] = useState<SetorApi[]>([])
  const [setorTempId, setSetorTempId] = useState<string>("")

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      try {
        setCarregandoSetores(true)
        const { data } = await api.get("/area_de_visita")
        const list = Array.isArray(data) ? data : []
        const parsed: SetorApi[] = list
          .map((it: any) => ({
            area_de_visita_id: Number(it?.area_de_visita_id),
            setor: String(it?.setor ?? "")
          }))
          .filter((x) => Number.isFinite(x.area_de_visita_id) && x.setor)
        if (ativo) setSetorOptions(parsed)
      } catch (e) {
        toast.error("Falha ao carregar setores.")
      } finally {
        if (ativo) setCarregandoSetores(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [])

  // Limpa os campos para o próximo cadastro
  function resetForm(opts: { keepUf?: boolean; keepFuncao?: boolean } = { keepUf: true, keepFuncao: false }) {
    const { keepUf = true, keepFuncao = true } = opts
    setNome("")
    setCpf("")
    setRg("")
    setNascimento("")
    setEmail("")
    setDdd("")
    setTelefone("")
    if (!keepUf) setUf("AL")
    setMunicipio("")
    setBairro("")
    setLogradouro("")
    setNumero("")
    if (!keepFuncao) setFuncao("")
    setSenha("")
    setConfirmarSenha("")
    setSetoresSelecionados([])
    setSetorTempId("")
    setSituacaoAtual(true)
    setRegistroServidor("")   // novo
    setDataAdmissao("")       // novo
    // foco no primeiro campo
    setTimeout(() => nomeRef.current?.focus(), 0)
  }

  function validarCampos(): string | null {
    if (!nome.trim()) return "Informe o nome completo."
    if (onlyDigits(cpf).length !== 11) return "Informe um CPF válido (11 dígitos)."
    if (!nascimento) return "Informe a data de nascimento."
    if (!isValidEmail(email)) return "Informe um e-mail válido."
    if (onlyDigits(ddd).length !== 2) return "Informe o DDD (2 dígitos)."
    const telDigits = onlyDigits(telefone)
    if (!(telDigits.length === 8 || telDigits.length === 9)) return "Informe um telefone válido (8 ou 9 dígitos)."
    if (!uf) return "Selecione o estado (UF)."
    if (!municipio.trim()) return "Informe o município."
    if (!bairro.trim()) return "Informe o bairro."
    if (!logradouro.trim()) return "Informe o logradouro."
    if (!numero.trim()) return "Informe o número."
    if (!funcao) return "Selecione a função."
    if (!registroServidor.trim()) return "Informe o registro do servidor."   // novo
    if (!dataAdmissao) return "Informe a data de admissão."                  // novo
    if (senha.length < 6) return "A senha deve ter pelo menos 6 caracteres."
    if (senha !== confirmarSenha) return "As senhas não coincidem."
    if (setoresSelecionados.length === 0) return "Selecione pelo menos um setor de atuação."
    return null
  }

  function handleAddSetor() {
    if (!setorTempId) return
    const id = Number(setorTempId)
    const opt = setorOptions.find((o) => o.area_de_visita_id === id)
    if (!opt) return
    setSetoresSelecionados((prev) => {
      const exists = prev.some((s) => s.area_de_visita_id === opt.area_de_visita_id)
      return exists ? prev : [...prev, opt]
    })
    setSetorTempId("")
  }
  function handleRemoveSetor(id: number) {
    setSetoresSelecionados((prev) => prev.filter((x) => x.area_de_visita_id !== id))
  }

  function handleAddUsuario() {
    const erro = validarCampos()
    if (erro) {
      toast.error(erro)
      return
    }
    const novo: Usuario = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      cpf: formatCpf(cpf),
      rg: rg.trim(),
      nascimento,
      email: email.trim(),
      ddd: onlyDigits(ddd).slice(0, 2),
      telefone: formatPhone(telefone),
      uf,
      municipio: municipio.trim(),
      bairro: bairro.trim(),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      funcao: funcao as "AGENTE" | "SUPERVISOR",
      senha,
      setorAtuacao: setoresSelecionados,
      situacaoAtual,
      registroServidor: registroServidor.trim(), // novo
      dataAdmissao,                              // novo
    }
    setUsuarios((prev) => [novo, ...prev])
    resetForm({ keepUf: true, keepFuncao: false })
  }

  function handleRemove(id: string) {
    setUsuarios((prev) => prev.filter((u) => u.id !== id))
  }

  async function handleFinalizar() {
    if (usuarios.length === 0) {
      toast.error("Adicione pelo menos um usuário.")
      return
    }

    const payload = usuarios.map((u) => {
      const numeroParsed = parseInt(onlyDigits(u.numero), 10)
      const setoresIds = Array.isArray(u.setorAtuacao)
        ? u.setorAtuacao.map((s) => s.area_de_visita_id)
        : []

      return {
        nome_completo: u.nome,
        cpf: onlyDigits(u.cpf),
        rg: u.rg,
        data_nascimento: u.nascimento,
        email: u.email,
        telefone_ddd: Number(onlyDigits(u.ddd) || 0),
        telefone_numero: Number(onlyDigits(u.telefone) || 0),
        estado: u.uf,
        municipio: u.municipio,
        bairro: u.bairro,
        logradouro: u.logradouro,
        numero: Number.isNaN(numeroParsed) ? 0 : numeroParsed,
        registro_do_servidor: u.registroServidor || null,
        cargo: u.funcao === "AGENTE" ? "Agente de Endemias" : "Supervisor",
        situacao_atual: u.situacaoAtual,
        data_de_admissao: u.dataAdmissao || new Date().toISOString().slice(0, 10),
        setor_de_atuacao: setoresIds, // array de IDs
        senha: u.senha,
        nivel_de_acesso: u.funcao === "AGENTE" ? "agente" : "supervisor",
      }
    })

    const body = payload
    console.log("Payload final (lista):", body)

    try {
      setEnviando(true)
      const res = await api.post("/usuarios", body)
      console.log("Resposta /usuarios:", res.data)
      toast.success("Cadastro finalizado com sucesso.")
      setOpen(false)
    } catch (e: any) {
      console.error("Erro ao enviar /usuarios:", e?.response?.data || e)
      console.debug("Payload que falhou:", body)
      const msg = e?.response?.data?.message || "Falha ao finalizar cadastro."
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
          className="h-20 bg-gradient-to-r from-orange to-orange-dark hover:from-orange-dark hover:to-orange text-white text-xl border-none"
        >
          <ClipboardList className="!h-6 !w-6 shrink-0" />
          Cadastrar novo usuário
        </Button>
      </DialogTrigger>

      <DialogContent
        className="bg-white border-none sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Cadastrar novo usuário</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 flex-1 overflow-y-auto p-1">
          <div className="text-md font-medium text-blue-dark">Dados pessoais</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="sm:col-span-2">
              <Label className="text-gray-500" htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                placeholder="Digite o nome do usuário"
                className="bg-secondary border-none text-blue-dark"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                ref={nomeRef}
              />
            </div>
            <div>
              <Label className="text-gray-500" htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                className="bg-secondary border-none text-blue-dark"
                value={formatCpf(cpf)}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-500" htmlFor="rg">RG</Label>
              <Input
                id="rg"
                placeholder="00000000-0"
                className="bg-secondary border-none text-blue-dark"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-500" htmlFor="nascimento">Data de nascimento</Label>
              <Input
                id="nascimento"
                type="date"
                placeholder="DD/MM/AAAA"
                className="bg-secondary border-none text-blue-dark"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
              />
            </div>
          </div>

          <div className="text-md font-medium text-blue-dark">Dados de contato</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-500" htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                className="bg-secondary border-none text-blue-dark"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-gray-500" htmlFor="ddd">Telefone (DDD)</Label>
                <Input
                  id="ddd"
                  placeholder="DD"
                  inputMode="numeric"
                  maxLength={2}
                  className="bg-secondary border-none text-blue-dark"
                  value={onlyDigits(ddd).slice(0,2)}
                  onChange={(e) => setDdd(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-500" htmlFor="telefone">Celular</Label>
                <Input
                  id="telefone"
                  placeholder="91234-5678"
                  inputMode="numeric"
                  maxLength={10}
                  className="bg-secondary border-none text-blue-dark"
                  value={formatPhone(telefone)}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
            </div>
          </div>

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
            <div>
              <Label className="text-gray-500" htmlFor="municipio">Município</Label>
              <Input
                id="municipio"
                placeholder="Digite o município"
                className="bg-secondary border-none text-blue-dark"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-500" htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                placeholder="Digite o bairro"
                className="bg-secondary border-none text-blue-dark"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Label className="text-gray-500" htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                placeholder="Rua do Sol"
                className="bg-secondary border-none text-blue-dark"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-500" htmlFor="numero">Número</Label>
              <Input
                id="numero"
                placeholder="000"
                className="bg-secondary border-none text-blue-dark"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
          </div>


          <div className="text-md font-medium text-blue-dark">Dados profissionais</div>
          <div className="">
            <div>
              <Label className="text-gray-500">Função</Label>
              <Select value={funcao} onValueChange={(v) => setFuncao(v as "AGENTE" | "SUPERVISOR")}>
                <SelectTrigger className="bg-secondary w-full border-none text-blue-dark">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent className="bg-white border-none">
                  <SelectItem value="AGENTE">Agente</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Situação */}
            <div className="mt-2">
              <Label className="text-gray-500">Situação</Label>
              <Select value={situacaoAtual ? "true" : "false"} onValueChange={(v) => setSituacaoAtual(v === "true")}>
                <SelectTrigger className="bg-secondary w-full border-none text-blue-dark">
                  <SelectValue placeholder="Selecione a situação" />
                </SelectTrigger>
                <SelectContent className="bg-white border-none">
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Registro e Admissão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-gray-500" htmlFor="registro_servidor">Registro do servidor</Label>
                <Input
                  id="registro_servidor"
                  placeholder="Ex.: MAT54321"
                  className="bg-secondary border-none text-blue-dark"
                  value={registroServidor}
                  onChange={(e) => setRegistroServidor(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-gray-500" htmlFor="data_admissao">Data de admissão</Label>
                <Input
                  id="data_admissao"
                  type="date"
                  className="bg-secondary border-none text-blue-dark"
                  value={dataAdmissao}
                  onChange={(e) => setDataAdmissao(e.target.value)}
                />
              </div>
            </div>

            {/* Senhas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-gray-500" htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Digite a senha"
                  className="bg-secondary border-none text-blue-dark"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-gray-500" htmlFor="confirmar_senha">Confirmar senha</Label>
                <Input
                  id="confirmar_senha"
                  type="password"
                  placeholder="Repita a senha"
                  className="bg-secondary border-none text-blue-dark"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
            </div>

            {/* Setor de atuação (via API) */}
            <div className="mt-3">
              <Label className="text-gray-500">Setor de atuação</Label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mt-1">
                <Select value={setorTempId} onValueChange={setSetorTempId} disabled={carregandoSetores}>
                  <SelectTrigger className="bg-secondary w-full border-none text-blue-dark">
                    <SelectValue placeholder={carregandoSetores ? "Carregando setores..." : "Selecione o setor"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-none">
                    {setorOptions.length === 0 ? (
                      <SelectItem value="" disabled>Nenhum setor encontrado</SelectItem>
                    ) : (
                      setorOptions.map((s) => (
                        <SelectItem key={s.area_de_visita_id} value={String(s.area_de_visita_id)}>
                          {s.setor}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddSetor} className="sm:!w-40" disabled={!setorTempId}>
                  Adicionar setor
                </Button>
              </div>

              {setoresSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {setoresSelecionados.map((s) => (
                    <Badge key={s.area_de_visita_id} variant="secondary" className="flex items-center gap-2">
                      {s.setor}
                      <button
                        type="button"
                        onClick={() => handleRemoveSetor(s.area_de_visita_id)}
                        className="ml-1 text-red-600"
                        aria-label={`Remover ${s.setor}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-md font-medium text-blue-dark">Usuários adicionados</div>
          <div className="rounded-md border-none">
            <ScrollArea className="bg-secondary border-none h-40">
              {usuarios.length === 0 ? (
                <div className="flex h-40 border-none rounded-md items-center justify-center text-md text-muted-foreground">
                  Nenhum usuário adicionado.
                </div>
              ) : (
                <ul className="divide-y">
                  {usuarios.map((u) => (
                    <li key={u.id} className="flex items-start gap-3 p-3">
                      <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 text-md">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{u.nome}</span>
                          <Badge variant="secondary">{u.email}</Badge>
                          <Badge variant="outline">{u.cpf}</Badge>
                          <Badge variant="secondary">{`(${u.ddd}) ${u.telefone}`}</Badge>
                          <Badge variant="outline">{u.funcao === "AGENTE" ? "Agente" : "Supervisor"}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {u.logradouro}, {u.numero} — {u.bairro} — {u.municipio}/{u.uf}
                        </div>
                        {u.setorAtuacao?.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Setor(es): {u.setorAtuacao.map((s) => s.setor).join(", ")}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(u.id)} aria-label="Remover">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={handleAddUsuario}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar novo usuário
          </Button>
          <Button
            type="button"
            onClick={handleFinalizar}
            disabled={enviando || usuarios.length === 0}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}