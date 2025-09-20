import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function Index() {
  const location = useLocation();
  
  const header = (
    <>
      <DropdownMenu >
        <DropdownMenuTrigger><Menu className='text-blue-dark'></Menu></DropdownMenuTrigger>
        <DropdownMenuContent className="font-bold border-none text-blue-dark bg-white" >
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/">Mapa interativo</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/informacoes">Informações</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/login">Entrar</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );



  return (
    <div className="flex shadow bg-white justify-between items-center h-16 md:h-20">
      <div className="flex items-center md:w-[256px] border-r border-gray-300 px-4 py-2">
        <Link to="/" className="flex-col justify-items-center items-center">
          <h1 className="font-bold text-xl md:text-2xl text-blue">SACE</h1>
          <div className="hidden md:block">
            <p className="text-[11px]">Sistema de Alerta no Controle de Endemias</p>
          </div>
          
        </Link>
      </div>
      <div className="hidden md:block p-1">
        <div className="flex w-full gap-20 justify-between">
          <>
            <Link to="/">
                <Button className="md:text-xl md:w-[250px]" variant={location.pathname === '/' ? 'link' : 'outline'}>
                  Mapa interativo
                </Button>
            </Link>
            <Link to="/informacoes">
                <Button className="md:text-xl md:w-[250px]" variant={location.pathname === '/informacoes' ? 'link' : 'outline'}>
                  Informações
                </Button>
            </Link>
          </>
        </div>
      </div>
      <div className="hidden md:flex p-2 md:w-[256px] md:border-l md:justify-center border-gray-300">
        <Link to="/login">
            <Button className="md:text-2xl md:w-[156px] bg-gradient-to-r from-blue to-blue-dark text-white shadow-md" variant='default'>
              Entrar
            </Button>
        </Link>
      </div>
      
      <div className="block md:hidden">{header}</div>
      
    </div>
  );
}

export default Index;