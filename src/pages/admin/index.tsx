"use client"

import { useState } from "react"

import FormsAreas from "@/components/formsAreas"
import FormsUser from "@/components/formsUser"
import FormsDenuncia from "@/components/formsDenuncia"
import FormsArtigos from "@/components/formsArtigos"

import TabelaAgentes from "@/components/Tabelas/Agentes/Index"
import TabelaDenuncias from "@/components/Tabelas/Denuncias/Index"
import TabelaAreaDeVisitas from "@/components/Tabelas/AreasVisita/Index"
import TabelaArtigos from "@/components/Tabelas/Artigos/Index"
import FormNotificacao from "@/components/formNotificacao"
import FormNudges from "@/components/formNudges"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function Index() {
  const tabs = [
    { id: "areas", label: "Áreas de visita" },
    { id: "agentes", label: "Agentes" },
    { id: "denuncias", label: "Denúncias" },
    { id: "artigos", label: "Artigos" },
    { id: "notificacoes", label: "Notificações" },
  ] as const

  type TabId = (typeof tabs)[number]["id"]

  const [activeTab, setActiveTab] = useState<TabId>("areas")

  return (
    <div className="bg-secondary min-h-screen flex flex-col gap-4 pt-2">
      <div className="w-full grid gap-4 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FormsAreas />
        <FormsUser />
        <FormsDenuncia />
        <FormsArtigos />
      </div>


      <div className="block md:hidden w-full px-4 ">
        <Select
          value={activeTab}
          onValueChange={(value: TabId) => setActiveTab(value)}
        >
          <SelectTrigger className="w-full bg-white font-medium">
            <SelectValue placeholder="Selecione uma seção" />
          </SelectTrigger>
          <SelectContent className="bg-white font-medium">
            {tabs.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      <nav className="hidden md:block w-full">
        <div className="flex w-full px-4">
          {tabs.map(t => (
            <Button
              key={t.id}
              variant={activeTab === t.id ? "navactive" : "nav"}
              className={`relative flex-1 justify-center rounded-b-none font-medium ${
                activeTab === t.id ? "" : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {activeTab === t.id && (
                <span className="pointer-events-none absolute left-2 right-2 -bottom-2 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          ))}
        </div>
      </nav>

      <div className="w-full flex flex-col p-2 space-y-4">
        {activeTab === "areas" && (
          <div className="rounded-lg bg-white p-2 sm:p-4">
            <TabelaAreaDeVisitas />
          </div>
        )}

        {activeTab === "agentes" && (
          <div className="rounded-lg bg-white  p-2 sm:p-4">
            <TabelaAgentes />
          </div>
        )}

        {activeTab === "denuncias" && (
          <div className="rounded-lg bg-white p-2 sm:p-4">
            <TabelaDenuncias />
          </div>
        )}

        {activeTab === "artigos" && (
          <div className="rounded-lg bg-white p-2 sm:p-4">
            <TabelaArtigos />
          </div>
        )}

        {activeTab === "notificacoes" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-2 sm:p-4">
              <FormNotificacao />
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-4">
              <FormNudges />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Index
