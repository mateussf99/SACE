import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Home,
  Map,
  Users,
  Settings
} from "lucide-react"

type Item = {
  key: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  route: string
}

const items: Item[] = [
  { key: "dashboard", label: "Painel de informação", icon: Home, route: "/dashboard" },
  { key: "map", label: "Mapa interativo", icon: Map, route: "/mapa" },
  { key: "agents", label: "Agentes", icon: Users, route: "/agentes" },
  { key: "admin", label: "Administração", icon: Settings, route: "/administracao" },
]

/**
 * Ajuste a estratégia de detecção de rota ativa depois (ex: useLocation / usePathname).
 * Por enquanto, simulação com 'activeKey'.
 */
const activeKeyMock = "admin"

export default function SidebarAdmin() {
  const handleClick = useCallback((item: Item) => {
    // Trocar por navegação real (react-router-dom navigate() ou Next.js router.push()).
    console.log("Ir para:", item.route)
  }, [])

  return (
    <aside
      className="w-60 min-h-screen border-r bg-background p-3 flex flex-col gap-1"
      aria-label="Menu de administração"
    >
      <nav className="flex flex-col gap-1">
        {items.map(item => {
          const Icon = item.icon
            // variant secondary para ativo, ghost para inativo
          const isActive = item.key === activeKeyMock
          return (
            <Button
              key={item.key}
              variant={isActive ? "secondary" : "ghost"}
              className="justify-start gap-2"
              onClick={() => handleClick(item)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
            </Button>
          )
        })}
      </nav>
      <div className="mt-auto text-xs text-muted-foreground px-1 py-2">
        {/* Espaço para versão / logo / etc */}
      </div>
    </aside>
  )
}