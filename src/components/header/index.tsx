import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Mapa interativo" },
  { to: "/informacoes", label: "Informações" },
];

function Index() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sticky top-0 z-40 bg-white shadow">
      <div className="flex items-center justify-between px-3 sm:px-4 h-14 md:h-16 gap-2">
        <Link to="/" className="flex-col justify-items-center select-none">
          <h1 className="font-bold text-xl md:text-2xl text-blue leading-none">
            SACE
          </h1>
          <p className="hidden lg:block text-[11px] leading-tight">
            Sistema de Alerta no Controle de Endemias
          </p>
        </Link>

        
        <nav className="flex flex-1 justify-center">
          <div className="flex flex-wrap gap-2 sm:gap-4 xl:gap-8 justify-center">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to}>
                <Button
                  className="px-2 py-1 text-xs sm:text-base md:text-lg xl:text-xl min-w-[110px] sm:min-w-[150px] md:min-w-[160px] xl:min-w-[220px]"
                  variant={isActive(l.to) ? "secondary" : "outline"}
                >
                  {l.to === "/" ? (
                    <>
                      <span>Mapa</span>
                      <span className="hidden sm:inline"> interativo</span>
                    </>
                  ) : (
                    l.label
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </nav>

        
        <div className="flex">
          <Link to="/login">
            <Button
              className="px-3 py-1 text-xs sm:text-base md:text-lg xl:text-xl bg-gradient-to-r from-blue to-blue-dark text-white shadow-md whitespace-nowrap"
              variant="default"
            >
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Index;