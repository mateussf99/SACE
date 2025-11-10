import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Mapa interativo" },
  { to: "/informacoes", label: "Informações" },
];

function Index() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const nextLink =
    location.pathname === "/"
      ? navLinks[1]
      : location.pathname.startsWith("/informacoes")
      ? navLinks[0]
      : null;

  const mobileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Abrir menu de navegação">
        <Menu className="text-blue-dark" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[2000] font-semibold border-none text-blue-dark bg-white min-w-[180px]">
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/login">Entrar</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="sticky top-0 z-40 bg-white shadow">
      <div className="flex items-center justify-between px-3 sm:px-4 h-14 md:h-16 gap-2">
        {/* Logo / título */}
        <Link to="/" className="flex-col justify-items-center select-none">
          <h1 className="font-bold text-xl md:text-2xl text-blue leading-none">
            SACE
          </h1>
          <p className="hidden lg:block text-[11px] leading-tight">
            Sistema de Alerta no Controle de Endemias
          </p>
        </Link>

        {/* Mobile (<640px) botão único */}
        <div className="sm:hidden flex flex-1 justify-center">
          {nextLink && (
            <Link to={nextLink.to}>
              <Button className="min-w-[160px]" variant="outline">
                {nextLink.label}
              </Button>
            </Link>
          )}
        </div>

        {/* Tablet para cima (>=640px) dois botões */}
        <nav className="hidden sm:flex flex-1 justify-center">
          <div className="flex flex-wrap gap-4 xl:gap-8 justify-center">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to}>
                <Button
                  className="sm:text-base md:text-lg xl:text-xl min-w-[150px] md:min-w-[160px] xl:min-w-[220px]"
                  variant={isActive(l.to) ? "secondary" : "outline"}
                >
                  {l.label}
                </Button>
              </Link>
            ))}
          </div>
        </nav>

        {/* Ação (login) desktop */}
        <div className="hidden sm:flex">
          <Link to="/login">
            <Button
              className="sm:text-base md:text-lg xl:text-xl bg-gradient-to-r from-blue to-blue-dark text-white shadow-md whitespace-nowrap"
              variant="default"
            >
              Entrar
            </Button>
          </Link>
        </div>

        {/* Ícone menu para mobile somente */}
        <div className="sm:hidden flex items-center">{mobileMenu}</div>
      </div>
    </div>
  );
}

export default Index;