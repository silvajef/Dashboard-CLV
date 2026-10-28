/**
 * ModalVeiculo — cadastro/edição de veículo dividido em seções
 * (Identificação · Valores · Origem · Fotos), com resumo de pendências e
 * rodapé fixo, para salvar sem rolar o formulário inteiro.
 * Separado de Modals.jsx (que passava de 500 linhas) na reorganização de UX
 * de 27/10/2026.
 */
import { useState, useEffect, useRef } from 'react'
import { Modal, Btn } from './UI'
import { useFipe, parseFipeValor } from '../hooks/useFipe'
import { normalizarCombustivel, C, today } from '../lib/constants'
import { useBreakpoint } from '../lib/responsive'
import { SECOES_VEICULO, SECOES_ESSENCIAIS, pendenciasVeiculo, resumoPendencias } from '../lib/veiculoForm'
import { SecaoIdentificacao, SecaoValores, SecaoOrigem, SecaoFotos } from './ModalVeiculoSecoes'

const s = {
  nav:     { position: 'sticky', top: 0, zIndex: 2, display: 'flex', gap: 4, overflowX: 'auto', background: C.card,
             padding: '4px 0 12px', marginBottom: 12, borderBottom: `1px solid ${C.border}` },
  aba:     { border: '1px solid transparent', borderRadius: 8, cursor: 'pointer', fontSize: 13, padding: '7px 12px',
             whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Syne', sans-serif" },
  marca:   { fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px' },
  rodape:  { position: 'sticky', bottom: 0, zIndex: 2, background: C.card, borderTop: `1px solid ${C.border}`,
             padding: '12px 0 4px', marginTop: 8 },
  resumo:  { fontSize: 12, marginBottom: 10, lineHeight: 1.4 },
}

function estadoInicial(data) {
  return {
    placa:               data?.placa              || '',
    tipo:                data?.tipo               || 'Van',
    cor:                 data?.cor                || '',
    km:                  data?.km                 || 0,
    combustivel:         normalizarCombustivel(data?.combustivel || 'Diesel'),
    data_entrada:        data?.data_entrada       || today(),
    obs:                 data?.obs                || '',
    status:              data?.status             || 'pendente',
    marca_nome:          data?.marca_nome         || '',
    modelo_nome:         data?.modelo_nome        || '',
    ano_modelo:          data?.ano_modelo         || '',
    codigo_fipe:         data?.codigo_fipe        || '',
    valor_fipe:          data?.valor_fipe         || 0,
    valor_compra:        data?.valor_compra       || 0,
    valor_anuncio:       data?.valor_anuncio      || 0,
    chassi:              data?.chassi             || '',
    renavam:             data?.renavam            || '',
    fornecedor_tipo:     data?.fornecedor_tipo     || 'pessoa_fisica',
    fornecedor_nome:     data?.fornecedor_nome     || '',
    fornecedor_doc:      data?.fornecedor_doc      || '',
    fornecedor_telefone: data?.fornecedor_telefone || '',
    fornecedor_email:    data?.fornecedor_email    || '',
    fipe_historico:      data?.fipe_historico      || [],
  }
}

// Custos fixos — seção separada (banco retorna array na relação)
function custosFixosIniciais(data) {
  const cf0 = Array.isArray(data?.custos_fixos) ? data.custos_fixos[0] : data?.custos_fixos
  return {
    ipva:          cf0?.ipva         || 0,
    licenciamento: cf0?.licenciamento|| 0,
    transferencia: cf0?.transferencia|| 0,
    multas:        cf0?.multas       || 0,
    outros_desc:   cf0?.outros_desc  || '',
    outros_valor:  cf0?.outros_valor || 0,
  }
}

/**
 * Cascata FIPE do formulário: restaura a seleção salva na edição, limpa os
 * níveis abaixo quando o usuário troca marca/modelo e aplica o preço
 * consultado em f. Devolve os handlers dos selects.
 */
function useFipeDoFormulario(data, f, setF) {
  const fipe = useFipe(f.tipo)

  // Na edição, repõe marca/modelo/ano nos selects assim que as marcas
  // carregam — uma vez só, para não desfazer uma troca feita pelo usuário.
  const restaurouFipe = useRef(false)
  useEffect(() => {
    if (restaurouFipe.current || !data?.marca_nome || !fipe.marcas.length) return
    restaurouFipe.current = true
    fipe.restaurarSelecao({ marca: data.marca_nome, modelo: data.modelo_nome, ano: data.ano_modelo })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fipe.marcas.length])

  const pr = fipe.preco
  useEffect(() => {
    if (!pr?.CodigoFipe || pr.CodigoFipe === f.codigo_fipe) return
    setF(p => ({ ...p,
      codigo_fipe:    pr.CodigoFipe,
      valor_fipe:     parseFipeValor(pr.Valor),
      combustivel:    normalizarCombustivel(pr.Combustivel || p.combustivel),
      fipe_historico: pr.historico?.length ? pr.historico : p.fipe_historico,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr])

  const handlers = {
    marca: (codigo, nome) => {
      fipe.selecionarMarca(codigo, nome)
      setF(p => ({ ...p, marca_nome:nome||'', modelo_nome:'', ano_modelo:'', codigo_fipe:'', valor_fipe:0 }))
    },
    modelo: (codigo, nome) => {
      fipe.selecionarModelo(codigo, nome, fipe.sels.marcaCod)
      setF(p => ({ ...p, modelo_nome:nome||'', ano_modelo:'', codigo_fipe:'', valor_fipe:0 }))
    },
    ano: (codigo, nome) => {
      fipe.selecionarAno(codigo, nome, fipe.sels.marcaCod, fipe.sels.modeloCod)
      setF(p => ({ ...p, ano_modelo:nome||'' }))
    },
  }
  return { fipe, handlers }
}

// Props: { ativa, onChange, pendencias }
/** Navegação entre seções, com nome sempre visível e contador de pendências. */
function NavSecoes({ ativa, onChange, pendencias }) {
  return (
    <div style={s.nav} role="tablist" aria-label="Seções do cadastro">
      {SECOES_VEICULO.map(({ id, label }) => {
        const n   = pendencias[id].length
        const cor = SECOES_ESSENCIAIS.includes(id) ? C.amber : C.faint
        const sel = ativa === id
        return (
          <button key={id} role="tab" aria-selected={sel} onClick={() => onChange(id)}
            style={{ ...s.aba, background: sel ? C.cardHi : 'transparent', color: sel ? C.text : C.muted,
                     fontWeight: sel ? 700 : 400, borderColor: sel ? C.borderHi : 'transparent' }}>
            {label}
            {n > 0
              ? <span style={{ ...s.marca, background: `${cor}22`, color: cor }} aria-label={`${n} pendente(s)`}>{n}</span>
              : <span style={{ color: C.green, fontSize: 11 }} aria-label="completo">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

// Props: { pendentes: string[], editando, loading, onClose, onSave }
/** Rodapé fixo: o que falta para os cálculos + Cancelar/Salvar. */
function RodapeVeiculo({ pendentes, editando, loading, onClose, onSave }) {
  return (
    <div style={s.rodape}>
      <div style={{ ...s.resumo, color: pendentes.length ? C.amber : C.green }} role="status">
        {pendentes.length
          ? <>Falta para os cálculos: <strong>{pendentes.join(', ')}</strong>. Dá para salvar assim e completar depois.</>
          : '✓ Dados essenciais preenchidos'}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn variant="secondary" style={{ flex:1 }} onClick={onClose}>Cancelar</Btn>
        <Btn style={{ flex:1 }} onClick={onSave} disabled={loading}>
          {loading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Veículo'}
        </Btn>
      </div>
    </div>
  )
}

// Props: { data?: veiculo, onSave(veiculo), onClose(), loading: boolean }
/**
 * Modal de cadastro/edição de veículo.
 * Ex.: <ModalVeiculo data={veiculo} onSave={salvar} onClose={fechar} loading={salvando}/>
 */
export function ModalVeiculo({ data, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [f, setF]         = useState(() => estadoInicial(data))
  const [fotos, setFotos] = useState(data?.fotos || [])
  const [cf, setCf]       = useState(() => custosFixosIniciais(data))
  const [secao, setSecao] = useState('identificacao')

  const set    = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setUp  = (k, v) => set(k, (v || '').toUpperCase())
  const setCfK = (k, v) => setCf(p => ({ ...p, [k]: v }))
  const totalCf = (cf.ipva||0)+(cf.licenciamento||0)+(cf.transferencia||0)+(cf.multas||0)+(cf.outros_valor||0)

  const { fipe, handlers } = useFipeDoFormulario(data, f, setF)
  const fipeIgualCadastro = !!data?.marca_nome && f.marca_nome === data.marca_nome
    && f.modelo_nome === (data.modelo_nome || '') && f.ano_modelo === (data.ano_modelo || '')

  const pendencias = pendenciasVeiculo(f, fotos)
  const cols3 = isMobile ? '1fr' : '1fr 1fr 1fr'
  const cols2 = isMobile ? '1fr' : '1fr 1fr'
  const props = { f, set, setUp, fipe, handlers, fipeIgualCadastro, cf, setCfK, totalCf, cols2, cols3 }

  return (
    <Modal title={data ? 'Editar Veículo' : 'Novo Veículo'} wide onClose={onClose}>
      <NavSecoes ativa={secao} onChange={setSecao} pendencias={pendencias}/>
      <div role="tabpanel">
        {secao === 'identificacao' && <SecaoIdentificacao {...props}/>}
        {secao === 'valores'       && <SecaoValores {...props}/>}
        {secao === 'origem'        && <SecaoOrigem {...props}/>}
        {secao === 'fotos'         && <SecaoFotos veiculoId={data?.id} fotos={fotos} setFotos={setFotos}/>}
      </div>
      <RodapeVeiculo pendentes={resumoPendencias(pendencias)} editando={!!data} loading={loading}
        onClose={onClose} onSave={() => onSave({ ...f, id: data?.id, fotos, _custos_fixos: cf })}/>
    </Modal>
  )
}
