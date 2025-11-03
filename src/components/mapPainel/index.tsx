import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Maximize2, Minimize2 } from "lucide-react";
import Dengue from "@/assets/dengue.svg";
import Chikungunya from "@/assets/chikungunya.svg";
import Zika from "@/assets/zika.svg";
import Caixa from "@/assets/caixa.svg";
import Moveis from "@/assets/moveis.svg";
import Fixos from "@/assets/fixos.svg";
import Pneus from "@/assets/pneus.svg";
import Lixos from "@/assets/lixos.svg";
import Naturais from "@/assets/naturais.svg";
import { usePeriod } from "@/contexts/PeriodContext";
import api from "@/services/api";

// Tipos
type Tab = "risks" | "deposits";

type DashboardSummary = {
  depositos: {
    a1: number;
    a2: number;
    b: number;
    c: number;
    d1: number;
    d2: number;
    e: number;
  };
  casos_confirmados: {
    dengue: number;
    zika: number;
    chikungunya: number;
  };
  areas_risco: {
    Preta: number;
    Vermelha: number;
    Laranja: number;
    Amarela: number;
  };
};

export interface MapPanelProps {
  className?: string;
  onSearch?: (query: string) => void | Promise<void>;
}

// Helpers e subcomponentes
function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-2.5 translate-y-[-1px] rounded-sm ring-1 ring-black/5"
      style={{ backgroundColor: color }}
    />
  );
}

function LineItem({ dot, label, value }: { dot: string; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ColorDot color={dot} />
        <span>{label}</span>
      </div>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function RisksLegend({
  risks,
  diseases,
}: {
  risks: { preta: number; vermelha: number; laranja: number; amarela: number };
  diseases: { dengue: number; chikungunya: number; zika: number };
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3 gap-2 grid grid-cols-2">
        <LineItem dot="#0b0b0b" label="Preta (Emergência)" value={risks.preta} />
        <LineItem dot="#ef4444" label="Vermelha (Perigo)" value={risks.vermelha} />
        <LineItem dot="#f59e0b" label="Laranja (Alerta)" value={risks.laranja} />
        <LineItem dot="#facc15" label="Amarela (Atenção)" value={risks.amarela} />
      </div>

      <div className="flex-col border-t pt-5 justify-items-center">
        <h2 className="font-bold text-blue-dark">
          Total de casos por doença do município
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <DiseaseStat label="Dengue" value={diseases.dengue} color="text-[#72777B]" icon={Dengue} />
          <DiseaseStat label="Chikungunya" value={diseases.chikungunya} color="text-[#72777B]" icon={Chikungunya} />
          <DiseaseStat label="Zika" value={diseases.zika} color="text-[#72777B]" icon={Zika} />
        </div>
      </div>
    </div>
  );
}

// Tipos de depósitos
function DepositsLegend({
  depositos,
}: {
  depositos: { a1a2: number; b: number; c: number; d1: number; d2: number; e: number };
}) {
  const item = (
    iconSrc: string,
    title: string,
    subtitle: string,
    value: number
  ) => (
    <div className="flex-col justify-items-center mb-4">
      <div className="flex-col justify-items-center ">
        <div className="text-blue">
          <img src={iconSrc} alt="" className="h-9 w-9" />
        </div>
        <div className="flex-col justify-items-center ">
          <div className="font-medium text-gray-600">{title}</div>
          <div className="text-xs text-gray-600">{subtitle}</div>
        </div>
      </div>
      <div className="text-3xl font-semibold ">{value.toString().padStart(2, "0")}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className=" grid grid-cols-3">
        {item(Caixa, "A1 e A2", "Armazen. de água", depositos.a1a2)}
        {item(Moveis, "B", "Depósitos móveis", depositos.b)}
        {item(Fixos, "C", "Depósitos fixos", depositos.c)}
        {item(Pneus, "D1", "Pneus", depositos.d1)}
        {item(Lixos, "D2", "Lixo e sucata", depositos.d2)}
        {item(Naturais, "E", "Naturais", depositos.e)}
      </div>
    </div>
  );
}

function DiseaseStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}) {
  return (
    <div className="space-y-1 text-center">
      {icon && <img src={icon} alt={label} className="mx-auto h-9 w-9" />}
      <div className={`text-sm ${color ?? "text-muted-foreground"}`}>{label}</div>
      <div className="text-3xl font-bold tabular-nums">
        {value.toString().padStart(2, "0")}
      </div>
    </div>
  );
}

// Componente principal
export default function MapPanel({ className = "", onSearch }: MapPanelProps) {
  const [tab, setTab] = useState<Tab>("risks");
  const [query, setQuery] = useState("");
  const { year, cycle } = usePeriod();
  const [expanded, setExpanded] = useState<boolean>(() => {
    // md do Tailwind = min-width: 768px
    if (typeof window === "undefined") return true; // fallback seguro
    return window.matchMedia("(min-width: 768px)").matches;
  });

  const [summary, setSummary] = useState<DashboardSummary | null>(null); 

  // Notifica mudanças de layout para reposicionar o dialog ancorado da zona de calor
  useEffect(() => {
    window.dispatchEvent(new Event("map-panel-layout"));
  }, [expanded]);

  // Fetch do resumo do dashboard (logado: ano/ciclo, anônimo: latest)
  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const isLoggedIn = (() => {
          try {
            return !!localStorage.getItem("auth_token");
          } catch {
            return false;
          }
        })();

        const endpoint =
          isLoggedIn && year != null && cycle != null
            ? `/dashboard_summary/${year}/${cycle}`
            : `/dashboard_summary/latest`;

        const { data } = await api.get<DashboardSummary>(endpoint);
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) setSummary(null);
        
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [year, cycle]);

  const triggerSearch = () => {
    const q = query.trim();
    if (!q) return;
    onSearch?.(q);
  };

  // Deriva valores com fallback para 0
  const risksData = {
    preta: summary?.areas_risco.Preta ?? 0,
    vermelha: summary?.areas_risco.Vermelha ?? 0,
    laranja: summary?.areas_risco.Laranja ?? 0,
    amarela: summary?.areas_risco.Amarela ?? 0,
  };

  const diseasesData = {
    dengue: summary?.casos_confirmados.dengue ?? 0,
    chikungunya: summary?.casos_confirmados.chikungunya ?? 0,
    zika: summary?.casos_confirmados.zika ?? 0,
  };

  const depositsData = {
    a1a2: (summary?.depositos.a1 ?? 0) + (summary?.depositos.a2 ?? 0),
    b: summary?.depositos.b ?? 0,
    c: summary?.depositos.c ?? 0,
    d1: summary?.depositos.d1 ?? 0,
    d2: summary?.depositos.d2 ?? 0,
    e: summary?.depositos.e ?? 0,
  };

  return (
    <div
      id="map-panel"
      className={`absolute border-none left-3 top-15 md:top-15 lg:top-3 z-[1100] w-[300px] md:w-[360px] max-w-[92vw] transition-all duration-200 ${className}`}
    >
      <Card className="rounded-2xl bg-white border-none shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <CardHeader className="gap-3">
          <div className="relative flex items-center gap-2">
            <div className="pointer-events-none absolute left-3 text-muted-foreground">
              <Search className="size-4" />
            </div>
            <Input
              placeholder="Pesquise por um bairro, cidade."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
              className="pl-9 pr-10 bg-focus border-none"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={expanded ? "Recolher" : "Expandir"}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>

          {expanded && (
            <div className="flex gap-2 bg-secondary rounded-2xl">
              <Button
                variant={tab === "risks" ? "dark" : "ghost"}
                onClick={() => setTab("risks")}
                className="flex-1 rounded-2xl"
              >
                Áreas de risco
              </Button>
              <Button
                variant={tab === "deposits" ? "dark" : "ghost"}
                onClick={() => setTab("deposits")}
                className="flex-1 rounded-2xl"
              >
                Depósitos
              </Button>
            </div>
          )}
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-5">
            {tab === "risks" ? (
              <RisksLegend risks={risksData} diseases={diseasesData} />
            ) : (
              <DepositsLegend depositos={depositsData} />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
