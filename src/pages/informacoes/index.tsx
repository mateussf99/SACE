import {useState, useEffect} from 'react'
import Artigo from '@/components/artigo'
import api from '@/services/api'

type ArtigoDTO = {
  artigo_id: number
  data_criacao: string
  descricao: string
  imagem_nome?: string
  link_artigo: string
  supervisor_id: number
  supervisor_nome: string
  titulo: string
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function buildImageUrl(id?: number) {
  if (id === undefined || id === null) return undefined
  return `${API_BASE}/artigo/img/${id}`
}

function Index() {
  const [artigos, setArtigos] = useState<ArtigoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await api.get<ArtigoDTO[]>('/artigo') // ajuste se necessário
        if (!alive) return
        setArtigos(data)
      } catch {
        if (alive) setError('Não foi possível carregar os artigos.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex bg-white h-full w-full p-4 md:p-6">
      <div>
        <h1 className="text-blue-dark text-2xl font-semibold mb-4">
          Artigos relacionados
        </h1>

        {loading && <p>Carregando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {artigos.map((a) => (
              <Artigo
                key={a.artigo_id}
                href={a.link_artigo}
                titulo={a.titulo}
                descricao={a.descricao}
                imagemUrl={buildImageUrl(a.artigo_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Index