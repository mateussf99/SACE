import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Home,
  Map,
  User,
  ShieldUser,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext" // novo

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
  const { accessLevel } = useAuth()

  const handleClick = useCallback((item: Item) => {
    navigate(item.route)
  }, [navigate])

  // pathname atual
  const { pathname } = location

  // Apenas 'admin' ou 'supervisor' enxergam o item de Administração
  const canSeeAdmin = ["admin", "supervisor"].includes((accessLevel ?? "").toLowerCase())
  const visibleItems = items.filter((i) => i.key !== "admin" || canSeeAdmin)

  return (
    <aside
      className="w-14 md:w-60 min-h-screen bg-background p-2 md:p-3 flex flex-col gap-1"
      aria-label="Menu de administração"
    >
      <nav className="flex flex-col gap-2 md:gap-3">
        {visibleItems.map(item => {
          const isActive =
            pathname === item.route ||
            (item.route !== "/" && pathname.startsWith(item.route + "/"))

          const Icon = item.icon
          return (
            <Button
              key={item.key}
              variant={isActive ? "secondary" : "link"}
              className="w-full h-10 justify-center md:justify-start gap-0 md:gap-2 px-0 md:px-3"
              onClick={() => handleClick(item)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden md:inline text-sm">{item.label}</span>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}