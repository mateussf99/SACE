"use client"
import TabelaImoveisVisitados from '@/components/Tabelas/ImoveisVisitados/Index'

 function Index() {
  return (
    <div className="bg-secondary h-full mt-2 flex flex-col gap-4">

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4"></div>

      <div className="w-full px-5">
        <h2 className="text-xl font-semibold mb-2 text-primary">
          Imóveis visitados
        </h2>
      </div>

      <div className="w-full flex flex-col gap-6 px-4 pb-4">
        <div className="rounded-lg bg-white shadow">
          <TabelaImoveisVisitados />
        </div>
      </div>
      
    </div>
  )
}
export default Index
