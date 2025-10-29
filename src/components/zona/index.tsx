import { useEffect, useId, useState } from 'react'
import { Circle, FeatureGroup } from 'react-leaflet'
import { Flame, TriangleAlert, X } from 'lucide-react'
import { createPortal } from 'react-dom'

type ZonaCor = 'vermelha' | 'laranja' | 'amarela' | 'preta'

type ZonaCalorProps = {
  titulo?: string
  descricao?: string
  extensaoKm2?: number
  casosConfirmados: number
  focosEncontrados: number
  // novos campos
  casosDengue?: number
  casosZika?: number
  casosChikungunya?: number
  cor?: ZonaCor
  lat: number
  lon: number
  radiusMeters?: number
  className?: string
}

const colorMap: Record<ZonaCor, { rgb: string; ring: string; label: string; icon: React.ReactNode }> = {
  vermelha: { rgb: '239,68,68', ring: '#b91c1c', label: 'Zona vermelha (Perigo)', icon: <Flame className="h-5 w-5 text-red-600" /> },
  laranja: { rgb: '245,158,11', ring: '#d97706', label: 'Zona laranja (Alerta)', icon: <TriangleAlert className="h-5 w-5 text-amber-600" /> },
  amarela: { rgb: '234,179,8', ring: '#ca8a04', label: 'Zona amarela (Atenção)', icon: <TriangleAlert className="h-5 w-5 text-yellow-600" /> },
  preta:   { rgb: '17,24,39', ring: '#111827', label: 'Zona preta (Emergência)', icon: <TriangleAlert className="h-5 w-5 text-gray-900" /> },
}

function ZonaCalor({
  titulo,
  descricao = 'Alta concentração de casos, risco elevado de transmissão.',
  casosConfirmados,
  focosEncontrados,
  // novos campos
  casosDengue,
  casosZika,
  casosChikungunya,
  cor = 'vermelha',
  lat,
  lon,
  radiusMeters = 300, // raio padrão em metros
}: ZonaCalorProps) {
  const [open, setOpen] = useState(false)
  const { rgb, ring, label, icon } = colorMap[cor]
  const headingId = useId()

  // posição ancorada ao MapPanel
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number }>({
    top: 100,
    left: 12,
    width: 360,
  })

  function updatePosition() {
    const anchor = document.getElementById('map-panel')
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    let left = rect.left
    let width = rect.width
    let topPx = rect.bottom + 8
    const vw = window.innerWidth
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8)
    setPanelPos({ top: topPx, left, width })
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onResizeOrScroll = () => updatePosition()
    window.addEventListener('resize', onResizeOrScroll)
    window.addEventListener('scroll', onResizeOrScroll, true)
    const anchor = document.getElementById('map-panel')
    const onTransitionEnd = () => updatePosition()
    anchor?.addEventListener('transitionend', onTransitionEnd)

    // Ouve mudanças do painel (expandir/recolher)
    const onPanelLayout: EventListener = () => updatePosition()
    window.addEventListener('map-panel-layout', onPanelLayout)

   

    return () => {
      window.removeEventListener('resize', onResizeOrScroll)
      window.removeEventListener('scroll', onResizeOrScroll, true)
      anchor?.removeEventListener('transitionend', onTransitionEnd)
      window.removeEventListener('map-panel-layout', onPanelLayout)
      
    }
  }, [open])

  // Três círculos concêntricos para simular o gradiente (como o DivIcon fazia),
  // agora em metros para escalar “no mundo”, não na tela.
  const r1 = radiusMeters * 0.35
  const r2 = radiusMeters * 0.6
  const r3 = radiusMeters * 0.75

  return (
    <>
      <FeatureGroup eventHandlers={{ click: () => setOpen(true) }}>
        {/* Anel externo (mais claro) */}
        <Circle
          center={[lat, lon]}
          radius={r3}
          pathOptions={{
            color: 'transparent',
            fillColor: `rgba(${rgb},0.15)`,
            fillOpacity: 0.15,
          }}
        />
        {/* Anel médio */}
        <Circle
          center={[lat, lon]}
          radius={r2}
          pathOptions={{
            color: 'transparent',
            fillColor: `rgba(${rgb},0.35)`,
            fillOpacity: 0.35,
          }}
        />
        {/* Miolo (mais intenso) */}
        <Circle
          center={[lat, lon]}
          radius={r1}
          pathOptions={{
            color: 'transparent',
            fillColor: `rgba(${rgb},0.55)`,
            fillOpacity: 0.55,
          }}
        />
        {/* Anel tracejado quando aberto */}
        {open && (
          <Circle
            center={[lat, lon]}
            radius={r2}
            pathOptions={{
              color: ring,
              weight: 4,
              dashArray: '8 8',
              fillOpacity: 0,
            }}
          />
        )}
      </FeatureGroup>

      {open && createPortal(
        <>
          <div className="pointer-events-none fixed inset-0 z-[1900] bg-transparent" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="fixed border-none rounded-2xl z-[2000] bg-white p-6 shadow-lg outline-none transition-all duration-200"
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width, maxWidth: '92vw' }}
          >
            <button
              aria-label="Fechar"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
                {icon}
                {titulo ?? label}
              </h2>
              <p className="text-sm text-muted-foreground">{descricao}</p>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col rounded-md p-3 border">
                <p className="text-xs text-muted-foreground">Casos confirmados</p>
                <p className="font-semibold">{casosConfirmados}</p>
              </div>
              <div className="flex flex-col rounded-md p-3 border sm:col-span-2">
                <p className="text-xs text-muted-foreground">Focos encontrados</p>
                <p className="font-semibold">{focosEncontrados}</p>
              </div>
              <div className="flex flex-col rounded-md p-3 border">
                <p className="text-xs text-muted-foreground">Casos de Dengue</p>
                <p className="font-semibold">{casosDengue ?? 0}</p>
              </div>
              <div className="flex flex-col rounded-md p-3 border">
                <p className="text-xs text-muted-foreground">Casos de Zika</p>
                <p className="font-semibold">{casosZika ?? 0}</p>
              </div>
              <div className="flex flex-col rounded-md p-3 border">
                <p className="text-xs text-muted-foreground">Casos de Chikungunya</p>
                <p className="font-semibold">{casosChikungunya ?? 0}</p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

export default ZonaCalor