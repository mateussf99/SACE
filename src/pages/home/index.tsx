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

function index() {
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const handleSearch = async (q: string) => {
    const coords = await geocodeNominatim(q);
    if (coords) setFlyTo(coords);
  };
  return (
    <div className="relative w-full h-svh">
      <Map className="w-full h-full" flyTo={flyTo} />
      <MapPanel onSearch={handleSearch} />
    </div>
  )
}

export default index