import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Check, TriangleAlert, X, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/services/api";
import { usePeriod } from "@/contexts/PeriodContext";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";


function ConfirmPopover({
  anchorRef,
  open,
  onClose,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmClassName = "bg-blue text-white hover:bg-blue/90",
  onConfirm,
  loading = false,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 360,
  });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 360;
    const vw = window.innerWidth;
    const left = Math.min(Math.max(8, rect.left), vw - width - 8);
    const top = rect.bottom + 8;
    setPos({ top, left, width });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onResizeOrScroll = () => updatePosition();
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [open, updatePosition]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Overlay para fechar ao clicar fora */}
      <button
        aria-label="Fechar confirmação"
        className="fixed inset-0 z-[3000] bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed z-[3001] bg-white rounded-2xl p-4 shadow-lg outline-none"
        style={{ top: pos.top, left: pos.left, width: pos.width, maxWidth: "92vw" }}
      >
        <button
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold">{title}</h3>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            className={`${confirmClassName} disabled:opacity-60`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmText}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}

function Index() {
  const { user, fullName, accessLevel, logout } = useAuth();
  const navigate = useNavigate();
  const { year: selectedYear, cycle: currentCycle, setYear, setCycle } = usePeriod();

  const [yearCycleMap, setYearCycleMap] = useState<Record<number, number[]>>({});
  const [years, setYears] = useState<number[]>([]);
  const [latestYear, setLatestYear] = useState<number | null>(null);
  const [currentYearForCycles, setCurrentYearForCycles] = useState<number | null>(null);

  // status do ciclo
  const [checkingCycleStatus, setCheckingCycleStatus] = useState<boolean>(false);
  const [hasActiveCycle, setHasActiveCycle] = useState<boolean | null>(null);
  const [activeCycleInfo, setActiveCycleInfo] = useState<{ ciclo_id: number; ano: number; ciclo_numero: number } | null>(null);

  // loading das ações
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // confirmações (popover)
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  // refs dos botões (âncora do popover)
  const finalizeBtnRef = useRef<HTMLButtonElement>(null);
  const createBtnRef = useRef<HTMLButtonElement>(null);

  const canManageCycles = useMemo(
    () => ["supervisor", "admin"].includes((accessLevel ?? "").toLowerCase()),
    [accessLevel]
  );

  // estilos dinâmicos dos botões conforme status
  const matchesActiveFilter =
    !!activeCycleInfo &&
    selectedYear === activeCycleInfo.ano &&
    currentCycle === activeCycleInfo.ciclo_numero;

  const finalizeEnabled =
    !!hasActiveCycle && matchesActiveFilter && !checkingCycleStatus && !finalizeLoading;

  const createEnabled =
    hasActiveCycle === false && !checkingCycleStatus && !createLoading;

  // Carrega anos/ciclos
  const fetchYearsCycles = useCallback(async () => {
    try {
      // Ajuste do tipo para arrays de números
      const { data } = await api.get<Record<string, number[] | number>>("/anos_ciclos");
      const map: Record<number, number[]> = {};
      Object.entries(data ?? {}).forEach(([y, rawCycles]) => {
        const arr = Array.isArray(rawCycles) ? rawCycles : [rawCycles]; // normaliza
        map[Number(y)] = arr.slice().sort((a: number, b: number) => a - b);
      });

      const sortedYears = Object.keys(map).map(Number).sort((a, b) => b - a);
      const ly = sortedYears[0] ?? null;

      setYearCycleMap(map);
      setYears(sortedYears);
      setLatestYear(ly);

      setYear(ly);
      const latestCycle = ly != null && map[ly]?.length ? Math.max(...map[ly]) : null;
      setCycle(latestCycle);
      setCurrentYearForCycles(ly);
    } catch (e) {
      console.error("Erro ao carregar anos/ciclos:", e);
      toast.error("Erro ao carregar anos e ciclos");
    }
  }, [setYear, setCycle]);

  useEffect(() => {
    (async () => {
      await fetchYearsCycles();
    })();
  }, [fetchYearsCycles]);

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

  // Checar status do ciclo
  const checkCycleStatus = useCallback(async () => {
    setCheckingCycleStatus(true);
    try {
      const { data } = await api.get("/ciclos/status");
      const status = String(data?.status ?? "").toLowerCase();
      const isActive = status === "ativo";
      setHasActiveCycle(isActive);
      setActiveCycleInfo(isActive ? data?.detalhes ?? null : null);
    } catch (e) {
      console.error("Erro ao checar status do ciclo:", e);
      setHasActiveCycle(null);
      setActiveCycleInfo(null);
      toast.error("Erro ao checar status do ciclo");
    } finally {
      setCheckingCycleStatus(false);
    }
  }, []);

  useEffect(() => {
    checkCycleStatus();
  }, [checkCycleStatus, selectedYear, currentCycle]);

  // Confirmar finalização (após diálogo)
  const confirmFinalizeCycle = async () => {
    if (!activeCycleInfo?.ciclo_id) {
      toast.error("Nenhum ciclo ativo para finalizar");
      return;
    }
    setFinalizeLoading(true);
    try {
      // POST /finalizar_ciclo (sem payload)
      const { data } = await api.post("/finalizar_ciclo");
      toast.success(String(data?.message ?? `Ciclo ${activeCycleInfo.ciclo_numero} (${activeCycleInfo.ano}) finalizado`));
      setFinalizeConfirmOpen(false);
      await checkCycleStatus();
      await fetchYearsCycles();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message ?? "Falha ao finalizar ciclo");
    } finally {
      setFinalizeLoading(false);
    }
  };

  // Confirmar criação (após diálogo)
  const confirmCreateCycle = async () => {
    setCreateLoading(true);
    try {
      // POST /criar_ciclo (sem payload)
      const { data } = await api.post("/criar_ciclo");
      toast.success(String(data?.message ?? "Novo ciclo criado"));
      setCreateConfirmOpen(false);
      await fetchYearsCycles();
      await checkCycleStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message ?? "Falha ao criar ciclo");
    } finally {
      setCreateLoading(false);
    }
  };

  const cyclesForActiveYear = useMemo(
    () => (currentYearForCycles != null ? yearCycleMap[currentYearForCycles] ?? [] : []),
    [yearCycleMap, currentYearForCycles]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div
      className="
        flex items-center flex-nowrap bg-white shadow
        px-2 md:px-4 gap-2
        h-16 py-0
        overflow-x-auto
        [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
      "
    >
      <div
        className="
          flex items-center shrink-0
          md:w-[220px] lg:w-[260px]
          md:border-r border-gray-300
          pr-3 md:py-2 md:pr-4
        "
      >
        <Link to="/" className="flex-col justify-items-center">
          <h1 className="font-bold text-xl md:text-2xl text-blue leading-none">SACE</h1>
          <p className="hidden lg:block text-[11px] leading-none mt-1">
            Sistema de Alerta no Controle de Endemias
          </p>
        </Link>
      </div>

      <div
        className="
          flex-1 min-w-0
          flex items-center gap-1 sm:gap-2 md:gap-3
          overflow-x-auto whitespace-nowrap
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
        "
      >
        {/* Anos */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="
                text-blue-dark px-2 md:px-3
                min-w-0 sm:min-w-[110px] md:min-w-[150px]
                flex items-center gap-1
              "
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
              className="
                text-blue-dark px-2 md:px-3
                min-w-0 sm:min-w-[96px] md:min-w-[110px]
                flex items-center gap-1 disabled:opacity-70
              "
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
            <Button
              ref={finalizeBtnRef}
              className={`${
                finalizeEnabled
                  ? "bg-blue text-white hover:bg-blue/90"
                  : "bg-gray-200 text-gray-500 hover:bg-gray-200"
              } disabled:opacity-60`}
              aria-label="Finalizar ciclo"
              aria-busy={finalizeLoading || checkingCycleStatus}
              onClick={() => setFinalizeConfirmOpen(true)}
              disabled={
                checkingCycleStatus ||
                finalizeLoading ||
                !hasActiveCycle ||
                !matchesActiveFilter
              }
              title={
                checkingCycleStatus
                  ? "Verificando status do ciclo..."
                  : !hasActiveCycle
                  ? "Nenhum ciclo ativo para finalizar"
                  : !matchesActiveFilter
                  ? "Selecione o ano e o ciclo ativo para finalizar"
                  : "Finalizar ciclo ativo"
              }
            >
              <Check className="size-4 shrink-0" />
              <p className="hidden lg:inline ml-2">
                {finalizeLoading ? "Finalizando..." : "Finalizar Ciclo"}
              </p>
            </Button>

            <Button
              ref={createBtnRef}
              className={`${
                createEnabled
                  ? "bg-blue text-white hover:bg-blue/90"
                  : "bg-gray-200 text-gray-500 hover:bg-gray-200"
              } disabled:opacity-60`}
              aria-label="Criar novo ciclo"
              aria-busy={createLoading || checkingCycleStatus}
              onClick={() => setCreateConfirmOpen(true)}
              disabled={checkingCycleStatus || createLoading || hasActiveCycle == null || hasActiveCycle}
              title={
                checkingCycleStatus
                  ? "Verificando status do ciclo..."
                  : hasActiveCycle
                  ? "Existe um ciclo ativo. Finalize-o para criar um novo."
                  : "Criar novo ciclo"
              }
            >
              <Plus className="size-4 shrink-0" />
              <p className="hidden lg:inline ml-2">
                {createLoading ? "Criando..." : "Criar Novo Ciclo"}
              </p>
            </Button>

            {/* Popover: Finalizar ciclo */}
            <ConfirmPopover
              anchorRef={finalizeBtnRef as React.RefObject<HTMLElement>}
              open={finalizeConfirmOpen}
              onClose={() => setFinalizeConfirmOpen(false)}
              title="Finalizar ciclo"
              description={
                activeCycleInfo
                  ? `Você está prestes a finalizar o ciclo ${activeCycleInfo.ciclo_numero} (${activeCycleInfo.ano}). Essa ação desativa o ciclo atual. Deseja continuar?`
                  : "Você está prestes a finalizar o ciclo ativo. Essa ação desativa o ciclo atual. Deseja continuar?"
              }
              confirmText={finalizeLoading ? "Finalizando..." : "Confirmar"}
              confirmClassName="bg-red-600 text-white hover:bg-red-700"
              onConfirm={confirmFinalizeCycle}
              loading={finalizeLoading}
            />

            {/* Popover: Criar ciclo */}
            <ConfirmPopover
              anchorRef={createBtnRef as React.RefObject<HTMLElement>}
              open={createConfirmOpen}
              onClose={() => setCreateConfirmOpen(false)}
              title="Criar novo ciclo"
              description="Será criado um novo ciclo. Confirma a criação?"
              confirmText={createLoading ? "Criando..." : "Confirmar"}
              confirmClassName="bg-blue text-white hover:bg-blue/90"
              onConfirm={confirmCreateCycle}
              loading={createLoading}
            />
          </>
        )}
      </div>

      {/* Usuário */}
      <div
        className="
          flex items-center gap-2 shrink-0
          md:border-l border-gray-300
          md:py-2 md:pl-4
        "
      >
        {/* Nome + nível visíveis em telas grandes */}
        <div className="hidden xl:flex flex-col items-end leading-tight max-w-[180px]">
          <span className="text-sm font-medium truncate">{fullName ?? user}</span>
          <span className="text-[11px] font-semibold opacity-80 uppercase tracking-wide truncate">
            {accessLevel}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-blue/10 text-blue-dark"
              aria-label="Abrir menu do usuário"
            >
              <UserRound className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="z-[2000] text-blue-dark bg-white border-none font-medium min-w-[220px]"
          >
            <DropdownMenuLabel className="space-y-0.5 xl:hidden">
              {/* Em telas pequenas continua aparecendo aqui */}
              <div className="font-medium truncate">{fullName ?? user}</div>
              <div className="text-xs font-semibold opacity-80 truncate">{accessLevel}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="xl:hidden" />
            <DropdownMenuItem onSelect={handleLogout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default Index;