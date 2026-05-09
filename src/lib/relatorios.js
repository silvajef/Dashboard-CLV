/**
 * relatorios.js — Geração de relatórios PDF (HTML imprimível)
 * v3.9.3 — Ficha do Veículo · Estoque · Vendas · KPI Executivo
 */
import { custoV, custoFixos, getCf, diasNoEstoque } from './constants'

/* ── Formatadores internos ──────────────────────────────────────────────── */
const R  = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
const N  = v => (v||0).toLocaleString('pt-BR')
const P  = v => `${(v||0).toFixed(1)}%`
const D  = iso => { if(!iso) return '—'; const s=iso.split('T')[0].split('-'); return `${s[2]}/${s[1]}/${s[0]}` }
const hoje = () => new Date().toLocaleDateString('pt-BR')
const statusLabel = {
  pendente:'Revisão Pendente', manutencao:'Em Manutenção',
  pronto:'Pronto p/ Venda', em_venda:'Em Venda', vendido:'Vendido',
}
const periodoLabel = { '30':'Últimos 30 dias','60':'Últimos 60 dias','90':'Últimos 90 dias','total':'Todo o período' }

/* ── CSS compartilhado ──────────────────────────────────────────────────── */
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff;padding:30px 40px;max-width:1060px;margin:0 auto}
  .btn-print{position:fixed;top:18px;right:18px;background:#111;color:#fff;border:none;padding:8px 20px;font-size:12px;cursor:pointer;border-radius:4px;font-family:Arial;z-index:99}
  .topo{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
  .empresa{font-size:20px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
  .subtitulo{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:4px;color:#333}
  .data-rel{font-size:10px;color:#666;margin-top:3px}
  h2{font-size:10px;background:#111;color:#fff;padding:4px 10px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:1px}
  h3{font-size:11px;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:4px;margin:12px 0 6px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px}
  th{background:#333;color:#fff;padding:5px 7px;text-align:left;font-weight:700;font-size:9px;letter-spacing:.4px;white-space:nowrap}
  td{border-bottom:1px solid #e0e0e0;padding:5px 7px;vertical-align:middle}
  tr:nth-child(even) td{background:#f9f9f9}
  .tr-total td{font-weight:700;background:#eee!important;border-top:2px solid #333}
  .mono{font-family:'Courier New',monospace}
  .right{text-align:right}
  .center{text-align:center}
  .verde{color:#15803d;font-weight:700}
  .vermelho{color:#b91c1c;font-weight:700}
  .amber{color:#b45309;font-weight:700}
  .badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700;border:1px solid currentColor}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}
  .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px}
  .kpi-card{border:1px solid #ccc;border-radius:4px;padding:10px 12px;text-align:center}
  .kpi-card .kv{font-size:20px;font-weight:900;font-family:'Courier New',monospace;margin-bottom:2px}
  .kpi-card .kl{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.5px}
  .campo{margin-bottom:5px;font-size:11px}
  .campo b{color:#333}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin-bottom:10px}
  .info-item{padding:4px 8px;background:#f5f5f5;border-radius:3px}
  .info-item .il{font-size:9px;color:#666;font-weight:700;text-transform:uppercase;margin-bottom:1px}
  .info-item .iv{font-size:11px;font-weight:600}
  .linha-custo{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;font-size:11px}
  .total-custo{display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;font-size:14px;font-weight:900}
  .margem-box{margin-top:6px;padding:6px 10px;border-radius:4px;font-size:11px;font-weight:700}
  .rodape{margin-top:24px;font-size:9px;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:8px}
  @media print{.btn-print{display:none!important}body{padding:12mm 18mm}h2{-webkit-print-color-adjust:exact;print-color-adjust:exact}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`

/* ── Header compartilhado ───────────────────────────────────────────────── */
function header(titulo, subtitulo = '') {
  return `
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    <div class="topo">
      <div class="empresa">CLV Veículos Comerciais</div>
      <div class="subtitulo">${titulo}</div>
      ${subtitulo ? `<div class="data-rel">${subtitulo}</div>` : ''}
      <div class="data-rel">Emitido em ${hoje()}</div>
    </div>`
}

function rodape() {
  return `<div class="rodape">CLV Veículos Comerciais · Relatório gerado pelo FleetControl v3.9 · ${hoje()}</div>`
}

function wrap(body) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório CLV</title><style>${CSS}</style></head><body>${body}</body></html>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. FICHA DO VEÍCULO
════════════════════════════════════════════════════════════════════════════ */
export function fichaVeiculo(v) {
  const cf       = getCf(v)
  const custoMnt = custoV(v)
  const custoFx  = custoFixos(v)
  const total    = (v.valor_compra||0) + custoMnt + custoFx
  const margem   = v.valor_anuncio > 0 ? v.valor_anuncio - total : null
  const dias     = diasNoEstoque(v)

  // Itens de custo fixo
  const itensCf = [
    { l:'IPVA',          val: cf?.ipva||0 },
    { l:'Licenciamento', val: cf?.licenciamento||0 },
    { l:'Transferência', val: cf?.transferencia||0 },
    { l:'Multas',        val: cf?.multas||0 },
    { l: cf?.outros_desc||'Outros', val: cf?.outros_valor||0 },
  ].filter(i => i.val > 0)

  const servicos = v.servicos || []
  const totalMnt = custoMnt

  const body = `
    ${header(`FICHA DO VEÍCULO — ${v.placa||''}`, `${v.marca_nome||''} ${v.modelo_nome||v.modelo||''} ${v.ano_modelo||''}`)}

    <h2>📋 Dados do Veículo</h2>
    <div class="info-grid">
      ${[
        ['Marca',       v.marca_nome||'—'],
        ['Modelo',      v.modelo_nome||v.modelo||'—'],
        ['Ano',         v.ano_modelo||'—'],
        ['Tipo',        v.tipo||'—'],
        ['Placa',       v.placa||'—'],
        ['Cor',         v.cor||'—'],
        ['KM Atual',    N(v.km)+' km'],
        ['Combustível', v.combustivel||'—'],
        ['Entrada',     D(v.data_entrada)],
        ['Cód. FIPE',   v.codigo_fipe||'—'],
        ['Status',      statusLabel[v.status]||v.status],
        ['Dias no est.',dias+' dias'],
      ].map(([l,val])=>`
        <div class="info-item">
          <div class="il">${l}</div>
          <div class="iv">${val}</div>
        </div>`).join('')}
    </div>

    <h2>💰 Valores</h2>
    <div class="grid3">
      <div class="kpi-card">
        <div class="kl">Valor de Compra</div>
        <div class="kv amber">${R(v.valor_compra)}</div>
      </div>
      <div class="kpi-card">
        <div class="kl">Tabela FIPE</div>
        <div class="kv" style="color:#15803d">${R(v.valor_fipe)}</div>
        ${v.valor_fipe&&v.valor_anuncio ? `<div style="font-size:10px;color:${v.valor_anuncio<v.valor_fipe?'#15803d':'#b91c1c'}">Anúncio: ${v.valor_anuncio<v.valor_fipe?'▼':'▲'} ${P(Math.abs((v.valor_anuncio-v.valor_fipe)/v.valor_fipe*100))}</div>` : ''}
      </div>
      <div class="kpi-card">
        <div class="kl">Valor de Anúncio</div>
        <div class="kv" style="color:#92400e">${R(v.valor_anuncio)}</div>
      </div>
    </div>

    <h2>💸 Custo Atual</h2>
    <div style="max-width:420px">
      ${[
        ['Valor de Compra', v.valor_compra||0, false],
        ...(custoMnt > 0 ? [['Total Manutenção', custoMnt, false]] : []),
        ...itensCf.map(i => [i.l, i.val, false]),
      ].map(([l,val])=>`
        <div class="linha-custo">
          <span>${l}</span>
          <span class="mono">${R(val)}</span>
        </div>`).join('')}
      <div class="total-custo">
        <span>TOTAL GASTO</span>
        <span class="mono vermelho">${R(total)}</span>
      </div>
      ${margem !== null ? `
        <div class="margem-box" style="background:${margem>=0?'#dcfce7':'#fee2e2'};border:1px solid ${margem>=0?'#86efac':'#fca5a5'}">
          <span class="${margem>=0?'verde':'vermelho'}">
            ${margem>=0?'▲ Margem estimada':'▼ Anúncio abaixo do custo'}: ${R(Math.abs(margem))}
          </span>
        </div>` : ''}
    </div>

    ${servicos.length > 0 ? `
    <h2>🔧 Histórico de Serviços (${servicos.length})</h2>
    <table>
      <thead><tr>
        <th>Tipo</th><th>Descrição</th><th>Data</th><th>Prestador</th>
        <th class="right">Peças</th><th class="right">Mão de Obra</th><th class="right">Outros</th><th class="right">Total</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${servicos.map(s=>{
          const t=(s.custo_pecas||0)+(s.custo_mao||0)+(s.outros||0)
          return `<tr>
            <td>${s.tipo||'—'}</td>
            <td>${s.descricao||'—'}</td>
            <td>${D(s.data_servico)}</td>
            <td>${s.prestador?.nome||'—'}</td>
            <td class="right mono">${R(s.custo_pecas)}</td>
            <td class="right mono">${R(s.custo_mao)}</td>
            <td class="right mono">${R(s.outros)}</td>
            <td class="right mono amber">${R(t)}</td>
            <td>${s.status||'—'}</td>
          </tr>`}).join('')}
        <tr class="tr-total">
          <td colspan="4">TOTAL MANUTENÇÃO</td>
          <td class="right mono">${R(servicos.reduce((s,m)=>s+(m.custo_pecas||0),0))}</td>
          <td class="right mono">${R(servicos.reduce((s,m)=>s+(m.custo_mao||0),0))}</td>
          <td class="right mono">${R(servicos.reduce((s,m)=>s+(m.outros||0),0))}</td>
          <td class="right mono vermelho">${R(totalMnt)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>` : ''}

    ${v.obs ? `
    <h2>📝 Observações</h2>
    <div style="background:#f5f5f5;border-left:3px solid #ccc;padding:10px 14px;font-size:11px">${v.obs}</div>` : ''}

    ${rodape()}
  `
  return wrap(body)
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. RELATÓRIO DE ESTOQUE ATIVO
════════════════════════════════════════════════════════════════════════════ */
export function relatorioEstoque(veiculos) {
  const ativos = veiculos.filter(v => v.status !== 'vendido')

  const totalCompra   = ativos.reduce((s,v)=>s+(v.valor_compra||0), 0)
  const totalAnuncio  = ativos.reduce((s,v)=>s+(v.valor_anuncio||0), 0)
  const totalMnt      = ativos.reduce((s,v)=>s+custoV(v), 0)
  const totalFx       = ativos.reduce((s,v)=>s+custoFixos(v), 0)
  const totalCusto    = totalCompra + totalMnt + totalFx
  const contStatus    = s => ativos.filter(v=>v.status===s).length

  const body = `
    ${header('RELATÓRIO DE ESTOQUE ATIVO', `${ativos.length} veículo(s)`)}

    <h2>📊 Resumo</h2>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Total Ativo</div><div class="kv">${ativos.length}</div></div>
      <div class="kpi-card"><div class="kl">Pronto p/ Venda</div><div class="kv verde">${contStatus('pronto')}</div></div>
      <div class="kpi-card"><div class="kl">Em Manutenção</div><div class="kv amber">${contStatus('manutencao')}</div></div>
      <div class="kpi-card"><div class="kl">Em Venda</div><div class="kv" style="color:#7c3aed">${contStatus('em_venda')}</div></div>
    </div>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Investido (Compra)</div><div class="kv amber">${R(totalCompra)}</div></div>
      <div class="kpi-card"><div class="kl">Custo Total (c/ mnt)</div><div class="kv vermelho">${R(totalCusto)}</div></div>
      <div class="kpi-card"><div class="kl">Valor em Anúncios</div><div class="kv verde">${R(totalAnuncio)}</div></div>
      <div class="kpi-card"><div class="kl">Custo Manutenção</div><div class="kv">${R(totalMnt)}</div></div>
    </div>

    <h2>🚛 Veículos em Estoque</h2>
    <table>
      <thead><tr>
        <th>#</th><th>Veículo</th><th>Placa</th><th>Ano</th><th class="right">KM</th>
        <th>Status</th><th class="right">Vl. Compra</th><th class="right">Manutenção</th>
        <th class="right">Fixos</th><th class="right">Custo Total</th>
        <th class="right">Vl. Anúncio</th><th class="right">Margem Est.</th>
        <th class="right">Dias</th>
      </tr></thead>
      <tbody>
        ${ativos.map((v,i)=>{
          const mnt   = custoV(v)
          const fx    = custoFixos(v)
          const total = (v.valor_compra||0)+mnt+fx
          const marg  = v.valor_anuncio>0 ? v.valor_anuncio-total : null
          const dias  = diasNoEstoque(v)
          return `<tr>
            <td class="center">${i+1}</td>
            <td>${v.marca_nome||''} ${v.modelo_nome||v.modelo||''}</td>
            <td class="mono">${v.placa||'—'}</td>
            <td>${v.ano_modelo||'—'}</td>
            <td class="right mono">${N(v.km)}</td>
            <td>${statusLabel[v.status]||v.status}</td>
            <td class="right mono amber">${R(v.valor_compra)}</td>
            <td class="right mono">${mnt>0?R(mnt):'—'}</td>
            <td class="right mono">${fx>0?R(fx):'—'}</td>
            <td class="right mono vermelho">${R(total)}</td>
            <td class="right mono">${v.valor_anuncio>0?R(v.valor_anuncio):'—'}</td>
            <td class="right ${marg===null?'':marg>=0?'verde':'vermelho'}">${marg===null?'—':R(marg)}</td>
            <td class="right ${dias>90?'vermelho':dias>60?'amber':''}">${dias}d</td>
          </tr>`}).join('')}
        <tr class="tr-total">
          <td colspan="6">TOTAIS (${ativos.length} veículos)</td>
          <td class="right mono amber">${R(totalCompra)}</td>
          <td class="right mono">${R(totalMnt)}</td>
          <td class="right mono">${R(totalFx)}</td>
          <td class="right mono vermelho">${R(totalCusto)}</td>
          <td class="right mono verde">${R(totalAnuncio)}</td>
          <td class="right mono">${totalAnuncio>0?R(totalAnuncio-totalCusto):'—'}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    ${rodape()}
  `
  return wrap(body)
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. RELATÓRIO DE VENDAS
════════════════════════════════════════════════════════════════════════════ */
export function relatorioVendas(veiculos, periodo = 'total') {
  const vendidos = veiculos
    .filter(v => v.status === 'vendido')
    .sort((a,b) => (b.data_venda||'').localeCompare(a.data_venda||''))

  const receita    = vendidos.reduce((s,v)=>s+(v.valor_venda||0), 0)
  const custoAq    = vendidos.reduce((s,v)=>s+(v.valor_compra||0), 0)
  const custoMnt   = vendidos.reduce((s,v)=>s+custoV(v), 0)
  const custoFxAll = vendidos.reduce((s,v)=>s+custoFixos(v), 0)
  const custoTotal = custoAq + custoMnt + custoFxAll
  const lucro      = receita - custoTotal
  const margem     = receita > 0 ? (lucro/receita)*100 : 0
  const ticket     = vendidos.length > 0 ? receita/vendidos.length : 0

  const body = `
    ${header('RELATÓRIO DE VENDAS', periodoLabel[periodo]||'Todo o período')}

    <h2>📊 Resumo Financeiro</h2>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Vendas Realizadas</div><div class="kv">${vendidos.length}</div></div>
      <div class="kpi-card"><div class="kl">Receita Total</div><div class="kv verde">${R(receita)}</div></div>
      <div class="kpi-card"><div class="kl">Custo Total</div><div class="kv vermelho">${R(custoTotal)}</div></div>
      <div class="kpi-card"><div class="kl">Lucro Bruto</div><div class="kv ${lucro>=0?'verde':'vermelho'}">${R(lucro)}</div></div>
    </div>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Margem Média</div><div class="kv ${margem>=0?'verde':'vermelho'}">${P(margem)}</div></div>
      <div class="kpi-card"><div class="kl">Ticket Médio</div><div class="kv">${R(ticket)}</div></div>
      <div class="kpi-card"><div class="kl">Custo Manutenção</div><div class="kv">${R(custoMnt)}</div></div>
      <div class="kpi-card"><div class="kl">Custos Fixos</div><div class="kv">${R(custoFxAll)}</div></div>
    </div>

    <h2>🏷 Histórico de Vendas</h2>
    <table>
      <thead><tr>
        <th>#</th><th>Veículo</th><th>Placa</th><th>Data Venda</th><th>Comprador</th>
        <th class="right">Vl. Compra</th><th class="right">Manutenção</th><th class="right">Fixos</th>
        <th class="right">Custo Total</th><th class="right">Vl. Venda</th>
        <th class="right">Lucro</th><th class="right">Margem</th><th class="right">Dias Est.</th>
      </tr></thead>
      <tbody>
        ${vendidos.length === 0
          ? '<tr><td colspan="13" class="center" style="color:#999;padding:20px">Nenhuma venda registrada</td></tr>'
          : vendidos.map((v,i)=>{
              const mnt   = custoV(v)
              const fx    = custoFixos(v)
              const ct    = (v.valor_compra||0)+mnt+fx
              const luc   = (v.valor_venda||0)-ct
              const mg    = v.valor_venda>0?(luc/v.valor_venda)*100:0
              const dias  = diasNoEstoque(v)
              return `<tr>
                <td class="center">${i+1}</td>
                <td>${v.marca_nome||''} ${v.modelo_nome||v.modelo||''}</td>
                <td class="mono">${v.placa||'—'}</td>
                <td>${D(v.data_venda)}</td>
                <td>${v.comprador_nome||'—'}</td>
                <td class="right mono amber">${R(v.valor_compra)}</td>
                <td class="right mono">${mnt>0?R(mnt):'—'}</td>
                <td class="right mono">${fx>0?R(fx):'—'}</td>
                <td class="right mono">${R(ct)}</td>
                <td class="right mono verde">${R(v.valor_venda)}</td>
                <td class="right mono ${luc>=0?'verde':'vermelho'}">${R(luc)}</td>
                <td class="right ${mg>=8?'verde':mg>=0?'amber':'vermelho'}">${P(mg)}</td>
                <td class="right">${dias}d</td>
              </tr>`}).join('')
        }
        ${vendidos.length > 0 ? `
        <tr class="tr-total">
          <td colspan="5">TOTAIS (${vendidos.length} vendas)</td>
          <td class="right mono amber">${R(custoAq)}</td>
          <td class="right mono">${R(custoMnt)}</td>
          <td class="right mono">${R(custoFxAll)}</td>
          <td class="right mono">${R(custoTotal)}</td>
          <td class="right mono verde">${R(receita)}</td>
          <td class="right mono ${lucro>=0?'verde':'vermelho'}">${R(lucro)}</td>
          <td class="right ${margem>=0?'verde':'vermelho'}">${P(margem)}</td>
          <td></td>
        </tr>` : ''}
      </tbody>
    </table>

    ${rodape()}
  `
  return wrap(body)
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. RELATÓRIO KPI EXECUTIVO
════════════════════════════════════════════════════════════════════════════ */
export function relatorioKPI(veiculos, metas = {}, periodo = 'total') {
  const todos    = veiculos
  const ativos   = todos.filter(v => v.status !== 'vendido')
  const vendidos = todos.filter(v => v.status === 'vendido')

  const receita    = vendidos.reduce((s,v)=>s+(v.valor_venda||0), 0)
  const custoAq    = vendidos.reduce((s,v)=>s+(v.valor_compra||0), 0)
  const custoMnt   = vendidos.reduce((s,v)=>s+custoV(v), 0)
  const custoFxAll = vendidos.reduce((s,v)=>s+custoFixos(v), 0)
  const lucro      = receita - custoAq - custoMnt - custoFxAll
  const margem     = receita > 0 ? (lucro/receita)*100 : 0
  const ticket     = vendidos.length > 0 ? receita/vendidos.length : 0
  const roi        = custoAq > 0 ? (lucro/custoAq)*100 : 0

  const diasAtivos  = ativos.map(v=>diasNoEstoque(v))
  const mediaDias   = diasAtivos.length ? diasAtivos.reduce((a,b)=>a+b,0)/diasAtivos.length : 0
  const parados90   = ativos.filter(v=>diasNoEstoque(v)>90).length
  const taxaGiro    = todos.length > 0 ? (vendidos.length/todos.length)*100 : 0

  const custoMntAtivos = ativos.reduce((s,v)=>s+custoV(v), 0)
  const valorEstTotal  = ativos.reduce((s,v)=>s+(v.valor_compra||0), 0)
  const indiceCusto    = valorEstTotal > 0 ? (custoMntAtivos/valorEstTotal)*100 : 0

  // Por tipo
  const tipos = [...new Set(todos.map(v=>v.tipo).filter(Boolean))]
  const porTipo = tipos.map(tipo => {
    const vt  = todos.filter(v=>v.tipo===tipo)
    const vv  = vt.filter(v=>v.status==='vendido')
    const rec = vv.reduce((s,v)=>s+(v.valor_venda||0),0)
    const ct  = vv.reduce((s,v)=>s+(v.valor_compra||0)+custoV(v)+custoFixos(v),0)
    const luc = rec - ct
    const mg  = rec>0?(luc/rec)*100:0
    return { tipo, qtd:vt.length, vendidos:vv.length, receita:rec, lucro:luc, margem:mg }
  }).sort((a,b)=>b.receita-a.receita)

  // Por mês
  const mesesMap = {}
  vendidos.forEach(v=>{
    if (!v.data_venda) return
    const d = new Date(v.data_venda)
    const m = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    if (!mesesMap[m]) mesesMap[m]={mes:m,qtd:0,receita:0,lucro:0}
    mesesMap[m].qtd++
    mesesMap[m].receita += v.valor_venda||0
    mesesMap[m].lucro   += (v.valor_venda||0)-(v.valor_compra||0)-custoV(v)-custoFixos(v)
  })
  const meses = Object.values(mesesMap).sort((a,b)=>a.mes.localeCompare(b.mes))

  // Ranking estoque parado
  const ranking = [...ativos]
    .sort((a,b)=>diasNoEstoque(b)-diasNoEstoque(a))
    .slice(0,10)

  // Metas
  const M = { vendas_mes:3, margem_min:8, dias_max_estoque:90, custo_max_pct:5, ...metas }
  const atingiu = (val, meta, inverso=false) => inverso ? val<=meta : val>=meta
  const metaRow = (label, val, meta, inverso=false, fmt='num') => {
    const ok = atingiu(val, meta, inverso)
    const fv = fmt==='pct' ? P(val) : fmt==='moeda' ? R(val) : String(Math.round(val))
    const fm = fmt==='pct' ? P(meta) : fmt==='moeda' ? R(meta) : String(Math.round(meta))
    return `<tr>
      <td>${label}</td>
      <td class="right mono">${fv}</td>
      <td class="right mono">${fm}</td>
      <td class="center ${ok?'verde':'vermelho'}">${ok?'✓ Atingida':'✕ Não atingida'}</td>
    </tr>`
  }

  const body = `
    ${header('RELATÓRIO EXECUTIVO — KPI', periodoLabel[periodo]||'Todo o período')}

    <h2>📊 Indicadores Principais</h2>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Estoque Ativo</div><div class="kv">${ativos.length}</div></div>
      <div class="kpi-card"><div class="kl">Vendas Realizadas</div><div class="kv verde">${vendidos.length}</div></div>
      <div class="kpi-card"><div class="kl">Taxa de Giro</div><div class="kv">${P(taxaGiro)}</div></div>
      <div class="kpi-card"><div class="kl">Parados +90 dias</div><div class="kv ${parados90>0?'vermelho':''}">${parados90}</div></div>
    </div>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Receita Total</div><div class="kv verde">${R(receita)}</div></div>
      <div class="kpi-card"><div class="kl">Lucro Bruto</div><div class="kv ${lucro>=0?'verde':'vermelho'}">${R(lucro)}</div></div>
      <div class="kpi-card"><div class="kl">Margem Média</div><div class="kv ${margem>=M.margem_min?'verde':'vermelho'}">${P(margem)}</div></div>
      <div class="kpi-card"><div class="kl">ROI</div><div class="kv ${roi>=0?'verde':'vermelho'}">${P(roi)}</div></div>
    </div>
    <div class="grid4">
      <div class="kpi-card"><div class="kl">Ticket Médio</div><div class="kv">${R(ticket)}</div></div>
      <div class="kpi-card"><div class="kl">Média Dias Est.</div><div class="kv ${mediaDias>M.dias_max_estoque?'vermelho':'amber'}">${Math.round(mediaDias)}d</div></div>
      <div class="kpi-card"><div class="kl">Índice Custo</div><div class="kv ${indiceCusto>M.custo_max_pct?'vermelho':'verde'}">${P(indiceCusto)}</div></div>
      <div class="kpi-card"><div class="kl">Valor em Estoque</div><div class="kv amber">${R(valorEstTotal)}</div></div>
    </div>

    ${meses.length > 0 ? `
    <h2>📅 Evolução Mensal de Vendas</h2>
    <table>
      <thead><tr>
        <th>Mês/Ano</th><th class="right">Vendas</th><th class="right">Receita</th>
        <th class="right">Lucro</th><th class="right">Margem</th>
      </tr></thead>
      <tbody>
        ${meses.map(m=>{
          const mg = m.receita>0?(m.lucro/m.receita)*100:0
          return `<tr>
            <td>${m.mes}</td>
            <td class="right">${m.qtd}</td>
            <td class="right mono verde">${R(m.receita)}</td>
            <td class="right mono ${m.lucro>=0?'verde':'vermelho'}">${R(m.lucro)}</td>
            <td class="right ${mg>=M.margem_min?'verde':'vermelho'}">${P(mg)}</td>
          </tr>`}).join('')}
        <tr class="tr-total">
          <td>TOTAL</td>
          <td class="right">${vendidos.length}</td>
          <td class="right mono verde">${R(receita)}</td>
          <td class="right mono ${lucro>=0?'verde':'vermelho'}">${R(lucro)}</td>
          <td class="right ${margem>=M.margem_min?'verde':'vermelho'}">${P(margem)}</td>
        </tr>
      </tbody>
    </table>` : ''}

    ${porTipo.length > 0 ? `
    <h2>🚛 Breakdown por Tipo de Veículo</h2>
    <table>
      <thead><tr>
        <th>Tipo</th><th class="right">Total</th><th class="right">Vendidos</th>
        <th class="right">Receita</th><th class="right">Lucro</th><th class="right">Margem</th>
      </tr></thead>
      <tbody>
        ${porTipo.map(t=>`<tr>
          <td>${t.tipo}</td>
          <td class="right">${t.qtd}</td>
          <td class="right">${t.vendidos}</td>
          <td class="right mono verde">${t.receita>0?R(t.receita):'—'}</td>
          <td class="right mono ${t.lucro>=0?'verde':'vermelho'}">${t.receita>0?R(t.lucro):'—'}</td>
          <td class="right ${t.margem>=M.margem_min?'verde':t.receita>0?'vermelho':''}">${t.receita>0?P(t.margem):'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    ${ranking.length > 0 ? `
    <h2>⏳ Estoque Parado (Ranking por Dias)</h2>
    <table>
      <thead><tr>
        <th>#</th><th>Veículo</th><th>Placa</th><th>Status</th>
        <th class="right">Dias no Est.</th><th class="right">Vl. Compra</th>
        <th class="right">Custo Total</th><th class="right">Vl. Anúncio</th>
      </tr></thead>
      <tbody>
        ${ranking.map((v,i)=>{
          const ct = (v.valor_compra||0)+custoV(v)+custoFixos(v)
          const dias = diasNoEstoque(v)
          return `<tr>
            <td class="center">${i+1}</td>
            <td>${v.marca_nome||''} ${v.modelo_nome||v.modelo||''}</td>
            <td class="mono">${v.placa||'—'}</td>
            <td>${statusLabel[v.status]||v.status}</td>
            <td class="right ${dias>90?'vermelho':dias>60?'amber':''}">${dias}d</td>
            <td class="right mono amber">${R(v.valor_compra)}</td>
            <td class="right mono vermelho">${R(ct)}</td>
            <td class="right mono">${v.valor_anuncio>0?R(v.valor_anuncio):'—'}</td>
          </tr>`}).join('')}
      </tbody>
    </table>` : ''}

    <h2>🎯 Metas vs Realizado</h2>
    <table>
      <thead><tr><th>Indicador</th><th class="right">Realizado</th><th class="right">Meta</th><th class="center">Situação</th></tr></thead>
      <tbody>
        ${metaRow('Margem Líquida Média', margem, M.margem_min, false, 'pct')}
        ${metaRow('Dias Máx. em Estoque', mediaDias, M.dias_max_estoque, true, 'num')}
        ${metaRow('Índice Custo/Estoque (%)', indiceCusto, M.custo_max_pct, true, 'pct')}
      </tbody>
    </table>

    ${rodape()}
  `
  return wrap(body)
}

/* ── Abrir em nova aba ─────────────────────────────────────────────────── */
export function abrirPDF(html) {
  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para gerar o PDF.'); return }
  w.document.write(html)
  w.document.close()
}
