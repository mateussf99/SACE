import { useEffect, useState } from "react";
import Map from "@/components/map";
import MapPanel from "@/components/mapPainel";
import { usePeriod } from "@/contexts/PeriodContext";
import api from "@/services/api";
import axios from "axios";

async function geocodeNominatim(query: string): Promise<[number, number] | null> {
  try {
    const params = new URLSearchParams({ q: query, format: "json", addressdetails: "1", limit: "1" });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "Accept-Language": "pt-BR" },
    });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data && data[0]) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {
    // ignore
  }
  return null;
}

type HeatmapZona = {
  area_de_visita_id: number;
  latitude: number; // pode vir string; coerção é feita no Map
  longitude: number;
  bairro: string;
  casos_dengue?: number;
  casos_zika?: number;
  casos_chikungunya?: number;
  focos_encontrados: number;
  total_casos_confirmados: number;
  nivel_risco?: string; // novo campo vindo da API
};

function index() {
  const { year, cycle } = usePeriod();
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [zonas, setZonas] = useState<HeatmapZona[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const token = localStorage.getItem("auth_token");
        const y = Number(year);
        const c = Number(cycle);

        let url = "/heatmap_data/latest";
        if (token && Number.isFinite(y) && Number.isFinite(c)) {
          url = `/heatmap_data/${y}/${c}`;
        }

        const { data } = await api.get<HeatmapZona[]>(url, { signal: controller.signal });
        setZonas(data ?? []);
      } catch (e: any) {
        // Ignora cancelamentos ao trocar ano/ciclo rapidamente
        if (axios.isCancel?.(e) || e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        console.error("Falha ao carregar heatmap:", e);
        setZonas([]);
      }
    }

    load();
    return () => {
      controller.abort();
    };
  }, [year, cycle]);

  const handleSearch = async (q: string) => {
    const coords = await geocodeNominatim(q);
    if (coords) setFlyTo(coords);
  };

  return (
    <div className="relative w-full h-[calc(100svh-4rem)] md:h-[calc(100svh-4rem)]">
      <Map className="w-full h-full" flyTo={flyTo} zones={zonas} />
      <MapPanel onSearch={handleSearch} />
    </div>
  );
}

export default index;