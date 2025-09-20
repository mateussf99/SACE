import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Maximize2, Home, Bot, Cog, Car, Trash2, Leaf } from "lucide-react";

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
    <div className="flex-col  justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ColorDot color={dot} />
        <span>{label}</span>
      </div>
      <span className="flex justify-items-center font-semibold tabular-nums">{value}</span>
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

      <div className="border-t pt-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <DiseaseStat label="Dengue" value={8} color="text-rose-500" icon="snow" />
          <DiseaseStat label="Chikungunya" value={5} color="text-sky-600" icon="spark" />
          <DiseaseStat label="Zika" value={2} color="text-amber-600" icon="sun" />
        </div>
      </div>
    </div>
  );
}
// Tipos de depósitos
function DepositsLegend() {
  const item = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    value: number
  ) => (
    <div className="flex-col justify-items-center ">
      <div className="flex-col justify-items-center ">
        <div className="text-blue">{icon}</div>
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
      <div className=" grid grid-cols-2 ">
        {item(<Home className="size-5" />, "A1 e A2", "Armazen. de água", 8)}
        {item(<Bot className="size-5" />, "B", "Depósitos móveis", 5)}
        {item(<Cog className="size-5" />, "C", "Depósitos fixos", 2)}
        {item(<Car className="size-5" />, "D1", "Pneus", 8)}
        {item(<Trash2 className="size-5" />, "D2", "Lixo e sucata", 5)}
        {item(<Leaf className="size-5" />, "E", "Naturais", 2)}
      </div>
    </div>
  );
}

function DiseaseStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: "snow" | "spark" | "sun";
}) {
  return (
    <div className="space-y-1 ">
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

  const triggerSearch = () => {
    const q = query.trim();
    if (!q) return;
    onSearch?.(q);
  };

  return (
    <div className={`absolute border-none left-3 top-3 z-[1100] w-[380px] max-w-[92vw] ${className}`}>
      <Card className="rounded-2xl bg-white border-none shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <CardHeader className="gap-3">
          <div className="relative flex items-center gap-2">
            <div className="pointer-events-none absolute left-3 text-muted-foreground">
              <Search className="size-4" />
            </div>
            <Input
              placeholder="Pesquise por um bairro, cidade ou município."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
              className="pl-9 pr-10 bg-focus border-none"
            />
            <Button variant="ghost" size="icon" aria-label="Expandir">
              <Maximize2 className="size-4" />
            </Button>
          </div>

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
        </CardHeader>

        <CardContent className="space-y-5">
          {tab === "risks" ? <RisksLegend /> : <DepositsLegend />}
        </CardContent>
      </Card>
    </div>
  );
}
