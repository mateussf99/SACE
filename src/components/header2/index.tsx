import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { usePeriod } from "@/contexts/PeriodContext";

function Index() {
  const { user, accessLevel, logout } = useAuth();
  const navigate = useNavigate();
  const { year: selectedYear, cycle: currentCycle, setYear, setCycle } = usePeriod();
  const [yearCycleMap, setYearCycleMap] = useState<Record<number, number[]>>({});
  const [years, setYears] = useState<number[]>([]);
  const [latestYear, setLatestYear] = useState<number | null>(null);

  const [currentYearForCycles, setCurrentYearForCycles] = useState<number | null>(null);

  const canManageCycles = useMemo(
    () => ["supervisor", "admin"].includes((accessLevel ?? "").toLowerCase()),
    [accessLevel]
  );

  // Busca anos/ciclos dentro do Header
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<Record<string, number[]>>("/anos_ciclos");
        if (!mounted) return;

        const map: Record<number, number[]> = {};
        Object.entries(data ?? {}).forEach(([y, cycles]) => {
          map[Number(y)] = (cycles ?? []).slice().sort((a, b) => a - b);
        });

        const sortedYears = Object.keys(map).map(Number).sort((a, b) => b - a);
        const ly = sortedYears[0] ?? null;

        setYearCycleMap(map);
        setYears(sortedYears);
        setLatestYear(ly);

        // maior ano e maior ciclo como valores iniciais (no Contexto)
        setYear(ly);
        const latestCycle = ly != null && map[ly]?.length ? Math.max(...map[ly]) : null;
        setCycle(latestCycle);

        setCurrentYearForCycles(ly);
      } catch (e) {
        console.error("Erro ao carregar anos/ciclos:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setYear, setCycle]);

  // Atualiza ciclos ao trocar o ano selecionado
  useEffect(() => {
    const active = selectedYear ?? latestYear ?? null;
    setCurrentYearForCycles(active);
    if (active != null) {
      const latest = yearCycleMap[active]?.length ? Math.max(...yearCycleMap[active]) : null;
      setCycle(latest);
    } else {
      setCycle(null);
    }
  }, [selectedYear, latestYear, yearCycleMap, setCycle]);

  const cyclesForActiveYear = useMemo(
    () => (currentYearForCycles != null ? yearCycleMap[currentYearForCycles] ?? [] : []),
    [yearCycleMap, currentYearForCycles]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center bg-white shadow px-3 md:px-4 h-14 md:h-16 gap-2">
      <div className="flex items-center shrink-0 md:w-[220px] lg:w-[260px] border-r border-gray-300 py-2 pr-4">
        <Link to="/" className="flex-col justify-items-center">
          <h1 className="font-bold text-xl md:text-2xl text-blue leading-none">SACE</h1>
          <p className="hidden md:block text-[11px] leading-none mt-1">
            Sistema de Alerta no Controle de Endemias
          </p>
        </Link>
      </div>

      
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap min-w-0 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="text-blue-dark px-2 md:px-3 min-w-[96px] sm:min-w-[110px] md:min-w-[150px] flex items-center gap-1"
            >
              <p className="hidden lg:inline">
                {selectedYear ? `Ano ${selectedYear}` : "Anos anteriores"}
              </p>
              <p className="lg:hidden">
                {selectedYear ? `${selectedYear}` : "Anos"}
              </p>
              <ChevronDown className="size-3 sm:size-4 ml-1 sm:ml-2 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="z-[2000] text-blue-dark bg-white border-none font-medium">
            <DropdownMenuItem onSelect={() => setYear(latestYear ?? null)}>
              Limpar filtro
            </DropdownMenuItem>
            {years.map((y) => (
              <DropdownMenuItem key={y} onSelect={() => setYear(y)}>
                {y}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ciclos (filtrados pelo ano ativo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={cyclesForActiveYear.length === 0}
              className="text-blue-dark px-2 md:px-3 min-w-[84px] sm:min-w-[96px] md:min-w-[110px] flex items-center gap-1 disabled:opacity-70"
            >
              <p>Ciclo {currentCycle ?? "-"}</p>
              <ChevronDown className="size-3 sm:size-4 ml-1 sm:ml-2 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="z-[2000] text-blue-dark bg-white border-none font-medium">
            {cyclesForActiveYear.map((c) => (
              <DropdownMenuItem key={c} onSelect={() => setCycle(c)}>
                Ciclo {c}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ações */}
        {canManageCycles && (
          <>
            <Button className="bg-blue/10 text-blue-dark hover:bg-blue/20" aria-label="Finalizar ciclo">
              <Check className="size-4" />
              <p className="hidden lg:inline ml-2">Finalizar Ciclo</p>
            </Button>

            <Button className="bg-blue text-white hover:bg-blue/90" aria-label="Criar novo ciclo">
              <Plus className="size-4" />
              <p className="hidden lg:inline ml-2">Criar Novo Ciclo</p>
            </Button>
          </>
        )}
      </div>

      {/* Usuário */}
      <div className="flex items-center gap-2 shrink-0 md:w-[240px] lg:w-[300px] border-l border-gray-300 py-2 pl-4">
        <div className="flex-1 text-right min-w-0">
          <div className="text-sm text-blue-dark leading-tight max-w-[160px] md:max-w-none truncate">{user}</div>
          <div className="text-xs font-semibold text-blue-dark leading-tight hidden sm:block">{accessLevel}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-blue/10 text-blue-dark">
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[2000] text-blue-dark bg-white border-none font-medium">
            <DropdownMenuItem onSelect={handleLogout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default Index;