import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState } from "react";

function Index() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Ciclos de exemplo; em breve podem vir da API
  const cycles = useMemo(() => [1, 2, 3, 4, 5], []);
  const [currentCycle, setCurrentCycle] = useState<number>(3);
  const unidade = "USF Village Campestre I"; // placeholder até vir do backend
  
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const mobileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Abrir menu">
        <Menu className="text-blue-dark" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="font-medium border-none text-blue-dark bg-white">
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/">Mapa interativo</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/informacoes">Informações</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleLogout}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );



  return (
    <header className="flex items-center justify-between bg-white shadow px-3 md:px-4">
      {/* Esquerda: Logo/título */}
      <div className="flex items-center md:w-[260px] border-r border-gray-300 py-2 pr-4">
        <Link to="/" className="flex flex-col">
          <h1 className="font-bold text-xl md:text-2xl text-blue leading-none">SACE</h1>
          <span className="hidden md:block text-[11px] leading-none mt-1">
            Sistema de Alerta no Controle de Endemias
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[110px] justify-between text-blue-dark">
              Ciclo {currentCycle}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-blue-dark bg-white border-none font-medium">
            {cycles.map((c) => (
              <DropdownMenuItem key={c} onSelect={() => setCurrentCycle(c)}>
                Ciclo {c}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button className="bg-blue/10 text-blue-dark hover:bg-blue/20">
          Finalizar Ciclo
        </Button>

        <Button className="bg-blue text-white hover:bg-blue/90">
          <Plus className="size-4" />
          Criar Novo Ciclo
        </Button>
      </div>

      <div className="flex items-center gap-2 md:w-[300px] border-l border-gray-300 py-2 pl-4">
        <div className="flex-1 text-right">
          <div className="text-sm text-blue-dark leading-tight">{user}</div>
          <div className="text-xs font-semibold text-blue-dark leading-tight">{unidade}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-blue/10 text-blue-dark">
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-blue-dark bg-white border-none font-medium">
            {/* <DropdownMenuItem asChild>
              <Link to="/perfil">Perfil</Link>
            </DropdownMenuItem> */}
            <DropdownMenuItem onSelect={handleLogout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  );
}

export default Index;