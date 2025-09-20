import { MapContainer, TileLayer, useMap, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

// Centro padrão: Maceió, Alagoas
const DEFAULT_CENTER: [number, number] = [-9.64985, -35.70895];

// Tipos
interface MapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  autoLocateOnLoad?: boolean; // tenta localizar ao montar
  flyTo?: [number, number] | null; // alvo externo para voar
}

// Ícone padrão (CDN)
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Hooks e utilitários
function useUserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const locate = (onSuccess?: (pos: [number, number]) => void) => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(p);
        setAccuracy(pos.coords.accuracy);
        setLoading(false);
        onSuccess?.(p);
      },
      () => { setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return { position, accuracy, loading, locate };
}
// Subcomponentes usados no Map
function MapControls({ geo }: { geo: ReturnType<typeof useUserLocation>; }) {
  const map = useMap();
  const btn = 'bg-white shadow rounded-md px-3 py-2 hover:bg-gray-100 active:scale-95 transition text-xs font-medium';

  const handleLocate = () => {
    geo.locate((p) => {
      map.flyTo(p, map.getZoom(), { animate: true, duration: 0.75 });
    });
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
      <button aria-label="Mais zoom" className={btn} onClick={() => map.zoomIn()}>+</button>
      <button aria-label="Menos zoom" className={btn} onClick={() => map.zoomOut()}>-</button>
      <button aria-label="Localizar usuário" className={btn} onClick={handleLocate} disabled={geo.loading}>
        {geo.loading ? 'Localizando...' : 'Minha posição'}
      </button>
    </div>
  );
}

function GeoLayers({ geo }: { geo: ReturnType<typeof useUserLocation>; }) {
  if (!geo.position) return null;
  const radius = geo.accuracy ? Math.min(geo.accuracy, 500) : 80;
  return (
    <>
      <Marker position={geo.position} />
      <Circle center={geo.position} radius={radius} pathOptions={{ color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }} />
    </>
  );
}

// Componente principal
export function Map({ center = DEFAULT_CENTER, zoom = 12, className = '', autoLocateOnLoad = false, flyTo = null }: MapProps) {
  const geo = useUserLocation();

  useEffect(() => {
    if (autoLocateOnLoad) {
      geo.locate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocateOnLoad]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      className={className}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <GeoLayers geo={geo} />
      <MapControls geo={geo} />
      {/* Reage a mudanças externas de alvo */}
      <FlyToController target={flyTo} />
    </MapContainer>
  );
}

export default Map;

function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, map.getZoom(), { animate: true, duration: 0.75 });
    }
  }, [target, map]);
  return null;
}
