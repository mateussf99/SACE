import { useState } from "react";
import Map from "@/components/map";
import MapPanel from "@/components/mapPainel";

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
const zonas = [
  {
    area_de_visita_id: 1,
    latitude: -9.65891,
    longitude: -35.70129,
    bairro: 'Ponta Verde',
    focos_encontrados: 25,
    total_casos_confirmados: 6,
  },
];


function index() {
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const handleSearch = async (q: string) => {
    const coords = await geocodeNominatim(q);
    if (coords) setFlyTo(coords);
  };
  return (
    <div className="relative w-full h-[calc(100svh-4rem)] md:h-[calc(100svh-4rem)]">
      <Map className="w-full h-full" flyTo={flyTo} zones={zonas} />
      <MapPanel onSearch={handleSearch} />
    </div>
  )
}

export default index