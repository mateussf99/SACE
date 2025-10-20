import { usePeriod } from "@/contexts/PeriodContext";

function index() {
  const { year, cycle } = usePeriod();
  // use 'year' e 'cycle' nas consultas/visualizações
  return <div>Ano: {year ?? "-"} | Ciclo: {cycle ?? "-"}</div>;
}

export default index