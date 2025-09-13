import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/api";
import { useState } from "react";

function index() {
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!cpf || !password) {
      setError("Por favor, preencha todos os campos")
      return
    }
    
    setLoading(true)
    setError("")
    
    // try {
    //    await authService.login(cpf, password)
    //   console.log("Login realizado com sucesso:")
    //   window.location.href = '/parceiros';
    // } catch (err: any) {
    //   setError(
    //     err.response?.data?.message || 
    //     "Falha ao fazer login. Verifique suas credenciais."
    //   )
    // } finally {
    //   setLoading(false)
    // }
   }

  return (
    <div className="bg-gradient-to-r from-blue to-blue-dark flex justify-center items-center h-screen">
        <div className="bg-white p-5 rounded-lg shadow-lg w-[340px] justify-items-center">
            <div className="flex-col justify-items-center mb-5">
                <h1 className="text-3xl text-blue font-bold ">SACE</h1>
                <h1 className="text-[15px]   mb-5">Sistema de Alerta no Controle de Endemias</h1>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              <div className="">
                <label htmlFor="cpf" className="text-sm font-medium text-primary">
                  CPF
                </label>
                <Input 
                  id="cpf"
                  type="string" 
                  placeholder="111.111.111-11" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="border border-primary rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
              
              <div className="">
                <label htmlFor="password" className="text-sm font-medium text-primary">
                  Senha
                </label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="Senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-primary rounded-md p-2 focus:outline-none focus:ring-0 focus:ring-primary"
                  disabled={loading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="mt-4"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
        </div>
    </div>
  )
}

export default index