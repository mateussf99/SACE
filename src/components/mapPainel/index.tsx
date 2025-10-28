import { useState } from "react";
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

// Tipos
type Tab = "risks" | "deposits";

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


function RisksLegend() {
  return (
    <div className="space-y-5">
      <div className="space-y-3 gap-2 grid grid-cols-2">
        <LineItem dot="#0b0b0b" label="Preta (Emergência)" value={2} />
        <LineItem dot="#ef4444" label="Vermelha (Perigo)" value={7} />
        <LineItem dot="#f59e0b" label="Laranja (Alerta)" value={3} />
        <LineItem dot="#facc15" label="Amarela (Atenção)" value={4} />
      </div>

      <div className="flex-col border-t pt-5 justify-items-center">
        
        <h2 className="font-bold text-blue-dark">
          Total de casos por doença do município
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <DiseaseStat label="Dengue" value={8} color="text-[#72777B]" icon={Dengue} />
          <DiseaseStat label="Chikungunya" value={5} color="text-[#72777B]" icon={Chikungunya} />
          <DiseaseStat label="Zika" value={2} color="text-[#72777B]" icon={Zika} />
        </div>
      </div>
    </div>
  );
}
// Tipos de depósitos
function DepositsLegend() {
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
        {item(Caixa, "A1 e A2", "Armazen. de água", 8)}
        {item(Moveis, "B", "Depósitos móveis", 5)}
        {item(Fixos, "C", "Depósitos fixos", 2)}
        {item(Pneus, "D1", "Pneus", 8)}
        {item(Lixos, "D2", "Lixo e sucata", 5)}
        {item(Naturais, "E", "Naturais", 2)}
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
  const [expanded, setExpanded] = useState(true);

  const triggerSearch = () => {
    const q = query.trim();
    if (!q) return;
    onSearch?.(q);
  };

  return (
  <div
    id="map-panel" // <- âncora para o dialog
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
            {tab === "risks" ? <RisksLegend /> : <DepositsLegend />}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
