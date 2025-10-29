import { MapContainer, TileLayer, useMap, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import ZonaCalor from '../zona';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';


// Centro padrão: Maceió, Alagoas
const DEFAULT_CENTER: [number, number] = [-9.64985, -35.70895];

// Tipos
interface MapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  autoLocateOnLoad?: boolean;
  flyTo?: [number, number] | null;
  zones?: RiskZone[]; // <- dados da API
}

export interface RiskZone {
  area_de_visita_id: number;
  latitude: number | string;
  longitude: number | string;
  bairro?: string;
  focos_encontrados: number;
  total_casos_confirmados: number;
  nivel_risco?: string; // novo: cor vem daqui
  casos_dengue?: number;
  casos_zika?: number;
  casos_chikungunya?: number;
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
// (Controles de zoom/localização removidos conforme solicitação)

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
export function Map({ center = DEFAULT_CENTER, zoom = 12, className = '', autoLocateOnLoad = false, flyTo = null, zones = [] }: MapProps) {
  const geo = useUserLocation();
  const [scope, setScope] = useState<'municipio' | 'estado' | null>(null);
  const [originAddr, setOriginAddr] = useState<{ city?: string; state?: string } | null>(null);

  // Captura endereço (cidade/estado) inicial do usuário quando a geolocalização for obtida
  useEffect(() => {
    async function fetchOrigin() {
      if (!geo.position || originAddr) return;
      try {
        const [lat, lon] = geo.position;
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=pt-BR`);
        const data = await resp.json();
        const addr = data.address || {};
        const cityName = addr.city || addr.town || addr.municipality || addr.village || addr.hamlet;
        const stateName = addr.state;
        setOriginAddr({ city: cityName, state: stateName });
      } catch {
        /* ignore */
      }
    }
    fetchOrigin();
  }, [geo.position, originAddr]);

  useEffect(() => {
    if (autoLocateOnLoad) {
      geo.locate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocateOnLoad]);

  // Quando o alvo externo (flyTo) muda, verificar se saiu do município/estado original; se sim, limpar escopo
  useEffect(() => {
    let cancelled = false;
    async function checkBoundary() {
      if (!flyTo) return;
      // Se não temos endereço de origem ainda, simplesmente resetar escopo para evitar estado incorreto
      if (!originAddr) {
        setScope(null);
        return;
      }
      try {
        const [lat, lon] = flyTo;
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=pt-BR`);
        const data = await resp.json();
        if (cancelled) return;
        const addr = data.address || {};
        const cityName = addr.city || addr.town || addr.municipality || addr.village || addr.hamlet;
        const stateName = addr.state;
        const leftCity = originAddr.city && cityName && cityName !== originAddr.city;
        const leftState = originAddr.state && stateName && stateName !== originAddr.state;
        if (leftCity || leftState) {
          setScope(null); // volta botões ao estado "normal"
        }
      } catch {
        // Em erro de geocodificação, não faz nada
      }
    }
    checkBoundary();
    return () => { cancelled = true; };
  }, [flyTo, originAddr]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      className={className}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
      markerZoomAnimation={false}   // <- ícones não “crescem” durante o zoom
      zoomAnimation={false}         // <- remove escala durante a animação de zoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <GeoLayers geo={geo} />
      {/* Zonas vindas da API */}
      {zones.map(z => {
        const cor = mapNivelRiscoToCor(z.nivel_risco);
        const lat = Number(z.latitude);
        const lon = Number(z.longitude);
        if (!cor || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        return (
          <ZonaCalor
            key={z.area_de_visita_id}
            lat={lat}
            lon={lon}
            titulo={z.bairro}
            cor={cor}
            casosConfirmados={z.total_casos_confirmados}
            focosEncontrados={z.focos_encontrados}
            casosDengue={z.casos_dengue}
            casosZika={z.casos_zika}
            casosChikungunya={z.casos_chikungunya}
            radiusMeters={1000}
          />
        );
      })}
      {/* Controle de escopo (Município / Estado) */}
      <ScopeController scope={scope} setScope={setScope} geo={geo} />
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

interface ScopeControllerProps {
  scope: 'municipio' | 'estado' | null;
  setScope: React.Dispatch<React.SetStateAction<'municipio' | 'estado' | null>>;
  geo: ReturnType<typeof useUserLocation>;
}

function ScopeController({ scope, setScope, geo }: ScopeControllerProps) {
  const map = useMap();
  const [loadingTarget, setLoadingTarget] = useState<'municipio' | 'estado' | null>(null);

  async function ensureLocation(): Promise<boolean> {
    if (geo.position) return true;
    return new Promise((resolve) => {
      geo.locate(() => resolve(true));
      setTimeout(() => resolve(Boolean(geo.position)), 8000);
    });
  }

  async function fetchAndFit(target: 'municipio' | 'estado') {
    if (scope === target) {
      setScope(null);
      return;
    }
    const hasLoc = await ensureLocation();
    if (!hasLoc || !geo.position) return;
    setLoadingTarget(target);
    try {
      const [lat, lon] = geo.position;
      const reverseResp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=pt-BR`);
      const reverseData = await reverseResp.json();
      const addr = reverseData.address || {};
      const cityName = addr.city || addr.town || addr.municipality || addr.village || addr.hamlet;
      const stateName = addr.state;

      let searchUrl: string | null = null;
      if (target === 'municipio' && cityName && stateName) {
        searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&city=${encodeURIComponent(cityName)}&state=${encodeURIComponent(stateName)}&country=Brazil&accept-language=pt-BR`;
      } else if (target === 'estado' && stateName) {
        searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&state=${encodeURIComponent(stateName)}&country=Brazil&accept-language=pt-BR`;
      }
      if (searchUrl) {
        const searchResp = await fetch(searchUrl);
        const searchData = await searchResp.json();
        const first = searchData[0];
        if (first?.boundingbox) {
          const bb = first.boundingbox; // [south, north, west, east]
          const bounds = L.latLngBounds([
            [parseFloat(bb[0]), parseFloat(bb[2])],
            [parseFloat(bb[1]), parseFloat(bb[3])]
          ]);
          map.fitBounds(bounds, { padding: [20, 20] });
        } else {
          map.flyTo([lat, lon], target === 'estado' ? 7 : 12, { animate: true, duration: 0.75 });
        }
      }
      setScope(target);
    } catch (e) {
      console.warn('Falha ao geocodificar:', e);
    } finally {
      setLoadingTarget(null);
    }
  }

  const baseBtn = 'h-9 px-5 rounded-full text-xs font-medium flex items-center gap-2 shadow transition border';
  // Mobile: canto superior esquerdo; md+: centralizado no topo
  const containerPos = 'pointer-events-auto absolute top-3 left-15 md:left-1/2 md:-translate-x-1/2 md:top-4 z-[1200]';

  return (
    <div className={containerPos}>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => fetchAndFit('municipio')}
          className={`${baseBtn} ${scope === 'municipio' ? 'bg-[#262649] border-[#262649] text-white hover:bg-[#262649]/90' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'}`}
          disabled={loadingTarget !== null}
        >
          <span>Seu Município</span>
          {scope === 'municipio' && (
            <X
              className="size-3 ml-1 cursor-pointer opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setScope(null); }}
            />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => fetchAndFit('estado')}
          className={`${baseBtn} ${scope === 'estado' ? 'bg-[#262649] border-[#262649] text-white hover:bg-[#262649]/90' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'}`}
          disabled={loadingTarget !== null}
        >
          <span>Seu Estado</span>
          {scope === 'estado' && (
            <X
              className="size-3 ml-1 cursor-pointer opacity-80 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setScope(null); }}
            />
          )}
        </Button>
      </div>
    </div>
  );
}

function mapNivelRiscoToCor(n?: string): 'vermelha' | 'laranja' | 'amarela' | 'preta' | null {
  if (!n) return null;
  const s = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (s === 'normal') return null;        // não renderiza zona
  if (s.startsWith('vermelh')) return 'vermelha';
  if (s.startsWith('laranja')) return 'laranja';
  if (s.startsWith('amarel')) return 'amarela';
  if (s.startsWith('preto') || s.startsWith('preta')) return 'preta';
  return null;
}
