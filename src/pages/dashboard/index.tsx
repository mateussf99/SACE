import FocosEncontrados from "@/components/GraficoBarras/FocosEncontrados/Index"
import AtividadesRealizadasBarras from "@/components/GraficoBarras/AtividadesRealizadas/Index"
import ImoveisTrabalhadosPizza from "@/components/GraficosPizza/ImoveisTrabalhados/Index"
import DepositosTratadosPizza from "@/components/GraficosPizza/GraficoDepositosTratados/Index"
import FocosPositivos from "@/components/MIniGraficos/FocosPositivos/Index"
import CasosConfirmados from "@/components/MIniGraficos/CasosConfirmados/Index"
import DepositosIdentificados from "@/components/MIniGraficos/DepositosIdentificados/Index"
import AcoesDeBloqueio from "@/components/graficoMultiplo/acoesBloqueio/Index"
import GraficoReincidencia from "@/components/GraficoBarras/Reincidencia/Index"
import GraficoImoveisTratados from "@/components/GraficoBarras/N_imoveis_tratados/Index"
import GraficoImoveisTrabalhados from "@/components/GraficoBarras/ImoveisTrabalhados/Index"

function Index() {
  return (
    <div className="bg-secondary min-h-screen flex flex-col gap-4 p-4">
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="rounded-lg bg-white shadow p-0">
          {/* Conteúdo do primeiro bloco */}

        </div>
        <div className="rounded-lg bg-white shadow p-0">
          {/* Conteúdo do segundo bloco */}
          < FocosPositivos />
        </div>
        <div className="rounded-lg bg-white shadow p-0">
          {/* Conteúdo do segundo bloco */}
          < CasosConfirmados />
        </div>
        <div className="rounded-lg bg-white shadow p-0">
          {/* Conteúdo do segundo bloco */}
          < DepositosIdentificados />
        </div>
      </div>


      {/* Linha 2 */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className="rounded-lg bg-white shadow p-0">
          {/* Conteúdo do primeiro bloco */}
          <ImoveisTrabalhadosPizza />
        </div>
        <div className="rounded-lg bg-white shadow p-0">
          {/* Conteúdo do segundo bloco */}
          <DepositosTratadosPizza />
        </div>
      </div>
      {/* Linha 3 */}
    <div className="grid gap-4 grid-cols-[1fr_1.3fr]">
        <div className=" rounded-lg bg-white shadow p-0">
          <FocosEncontrados />
        </div>
        <div className="rounded-lg bg-white shadow p-0">
          <AcoesDeBloqueio />
        </div>
      </div>

      {/* Linha 4 (invertida) */}
<div className="grid gap-4 grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg bg-white shadow p-0">
          <GraficoImoveisTratados/>
        </div>
        <div className=" rounded-lg bg-white shadow p-0">
        <GraficoImoveisTrabalhados/>
        </div>
      </div>

        <div className="grid gap-6 grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg bg-white shadow p-0">
          <GraficoReincidencia />
        </div>
        <div className=" rounded-lg bg-white shadow p-0">
          <AtividadesRealizadasBarras/>
        </div>
      </div>
    </div>
  )
}

export default Index
