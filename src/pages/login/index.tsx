import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function index() {
  // O backend Flask usa 'username' e 'password'. Vamos usar 'username' aqui.
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!username || !password) {
      setError("Por favor, preencha todos os campos")
      return
    }
    
    setLoading(true)
    setError("")
    
    try {
      const resp = await authService.login(username, password)
      await login(resp.token, resp.username)
      navigate('/')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Falha ao fazer login. Verifique suas credenciais."
      )
    } finally {
      setLoading(false)
    }
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
                <label htmlFor="username" className="text-sm font-medium ">
                  Usuário
                </label>
                <Input 
                  id="username"
                  type="text" 
                  placeholder="admin" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border rounded-md p-2 focus:border-0  focus:outline-none focus:ring-2 focus:ring-blue"
                  disabled={loading}
                />
              </div>
              
              <div className="">
                <label htmlFor="password" className="text-sm font-medium ">
                  Senha
                </label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="Senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border rounded-md p-2 focus:border-0 focus:outline-none focus:ring-0 focus:ring-blue"
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