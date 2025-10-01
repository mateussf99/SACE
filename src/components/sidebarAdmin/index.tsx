import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Home,
  Map,
  User,
  ShieldUser,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom" // <— adicionado

type Item = {
  key: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  route: string
}

const items: Item[] = [
  { key: "dashboard", label: "Painel de informação", icon: Home, route: "/dashboard" },
  { key: "map", label: "Mapa interativo", icon: Map, route: "/" },
  { key: "agents", label: "Agentes", icon: User, route: "/agentes" },
  { key: "admin", label: "Administração", icon: ShieldUser, route: "/administracao" },
]

export default function SidebarAdmin() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = useCallback((item: Item) => {
    navigate(item.route)
  }, [navigate])

  // pathname atual
  const { pathname } = location

  return (
    <aside
      className="w-70 min-h-screen bg-background p-3 flex flex-col gap-1"
      aria-label="Menu de administração"
    >
      <nav className="flex flex-col gap-3">
        {items.map(item => {
          // Ativo se pathname for exatamente a rota ou começar com ela (para subpáginas)
          const isActive =
            pathname === item.route ||
            (item.route !== "/" && pathname.startsWith(item.route + "/"))

          const Icon = item.icon
          return (
            <Button
              key={item.key}
              variant={isActive ? "secondary" : "ghost"}
              className="justify-start gap-2 h-10"
              onClick={() => handleClick(item)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}