import { Routes, Route, useParams } from 'react-router-dom'
import Navbar       from './components/Navbar'
import Dashboard    from './pages/Dashboard'
import Estoque      from './pages/Estoque'
import VeiculoDetalhe from './pages/VeiculoDetalhe'
import Vendidos     from './pages/Vendidos'
import Prestadores  from './pages/Prestadores'
import Historico    from './pages/Historico'
import KPIs         from './pages/KPIs'
import { Spinner, ErrorMsg } from './components/UI'
import { useVeiculos }    from './hooks/useVeiculos'
import { usePrestadores } from './hooks/usePrestadores'
import { useMetas }       from './hooks/useMetas'

// ── Wrapper para detalhe do veículo (extrai ID da URL) ────────────
function VeiculoDetalheWrapper({ veiculos, prestadores, loading, ops }) {
  const { id } = useParams()
  const veiculo = veiculos.find(v => String(v.id) === String(id))
  if (loading) return <Spinner/>
  if (!veiculo) return <ErrorMsg message={`Veículo #${id} não encontrado.`}/>
  return <VeiculoDetalhe veiculo={veiculo} prestadores={prestadores} ops={ops}/>
}

export default function App() {
  const { veiculos, loading: vLoading, error: vError, refetch: vRefetch,
          createVeiculo, updateVeiculo, deleteVeiculo, marcarVendido,
          createServico, updateServico, deleteServico } = useVeiculos()

  const { prestadores, loading: pLoading, error: pError, refetch: pRefetch,
          createPrestador, updatePrestador, deletePrestador } = usePrestadores()

  const { metas, saveMetas } = useMetas()

  const loading = vLoading || pLoading
  const error   = vError   || pError

  const ops = {
    createVeiculo, updateVeiculo, deleteVeiculo, marcarVendido,
    createServico, updateServico, deleteServico,
    createPrestador, updatePrestador, deletePrestador,
  }

  const sharedProps = { veiculos, prestadores, loading, error, refetch: vRefetch, ops }

  return (
    <div>
      <Navbar/>
      <main style={{maxWidth:1400, margin:'0 auto', padding:'28px 28px'}}>
        <Routes>
          <Route path="/"              element={<Dashboard   {...sharedProps}/>}/>
          <Route path="/estoque"       element={<Estoque     {...sharedProps}/>}/>
          <Route path="/estoque/:id"   element={<VeiculoDetalheWrapper {...sharedProps}/>}/>
          <Route path="/vendidos"      element={<Vendidos    {...sharedProps}/>}/>
          <Route path="/prestadores"   element={<Prestadores {...sharedProps}/>}/>
          <Route path="/historico"     element={<Historico   {...sharedProps}/>}/>
          <Route path="/kpis"          element={<KPIs        {...sharedProps} metas={metas} saveMetas={saveMetas}/>}/>
        </Routes>
      </main>
    </div>
  )
}
