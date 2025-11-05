import FormsAreas from '@/components/formsAreas'
import FormsUser from '@/components/formsUser'
import FormsDenuncia from '@/components/formsDenuncia'
import FormsArtigos from '@/components/formsArtigos'
import TabelaAgentes from '@/components/Tabelas/Agentes/Index'
import TabelaDenuncias from '@/components/Tabelas/Denuncias/Index'
import TabelaAreaDeVisitas from '@/components/Tabelas/AreasVisita/Index'
import TabelaArtigos from '@/components/Tabelas/Artigos/Index'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import FormNotificacao from '@/components/formNotificacao'

function index() {
  // abas
  const tabs = [
    { id: 'areas', label: 'Áreas de visita' },
    { id: 'agentes', label: 'Agentes' },
    { id: 'denuncias', label: 'Denúncias' },
    { id: 'artigos', label: 'Artigos' },
    { id: 'notificacoes', label: 'Notificações' },
  ] as const
  type TabId = typeof tabs[number]['id']
  const [activeTab, setActiveTab] = useState<TabId>('areas')

  return (
    <div className='bg-secondary h-full pt-2 flex-col gap-4'>
      <div className='w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4'>
        <FormsAreas />
        <FormsUser />
        <FormsDenuncia />
        <FormsArtigos />
      </div>

      {/* Navegação com shadcn Button + conteúdo */}
      <nav className='w-full '>
        <div className='flex w-full px-4'>
          {tabs.map(t => (
            <Button
              key={t.id}
              variant={activeTab === t.id ? 'navactive' : 'nav'}
              className={`relative flex-1 justify-center rounded-b-none font-medium ${activeTab === t.id ? '' : 'text-muted-foreground'
                }`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {activeTab === t.id && (
                <span className='pointer-events-none absolute left-2 right-2 -bottom-2 h-0.5 bg-primary rounded-full' />
              )}
            </Button>
          ))}
        </div>
      </nav>

      <div className='w-full flex-col p-4'>
        <div
          className={`${activeTab === 'areas' ? 'flex-col ' : 'hidden'}`}
          aria-hidden={activeTab !== 'areas'}
        >
          <div className=' rounded-lg bg-white shadow'><TabelaAreaDeVisitas /></div>
        </div>

        <div
          className={`${activeTab === 'agentes' ? 'flex-col ' : 'hidden'}`}
          aria-hidden={activeTab !== 'agentes'}
        >
          <div className='rounded-lg bg-white shadow'><TabelaAgentes /></div>
        </div>

        <div
          className={`${activeTab === 'denuncias' ? 'flex-col ' : 'hidden'}`}
          aria-hidden={activeTab !== 'denuncias'}
        >
          <div className='rounded-lg bg-white shadow'><TabelaDenuncias /></div>
        </div>

        <div
          className={`${activeTab === 'artigos' ? 'flex-col ' : 'hidden'}`}
          aria-hidden={activeTab !== 'artigos'}
        >
          <div className='rounded-lg bg-white shadow'><TabelaArtigos /></div>
        </div>

        <div
          className={`${activeTab === 'notificacoes' ? 'flex-col ' : 'hidden'}`}
          aria-hidden={activeTab !== 'notificacoes'}
        >
          <div className=' '>
            <FormNotificacao />
          </div>
        </div>
      </div>
    </div>
  )
}

export default index