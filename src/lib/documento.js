/**
 * documento.js — Geração do Contrato de Compra e Venda
 * v3.9 — Template profissional, ajuste o cabeçalho da empresa conforme necessário
 */
import { fmtR, fmtData } from './constants'

// ── Helpers ────────────────────────────────────────────────────────────────────
function linha(label, valor) {
  return `<div class="campo"><span class="label">${label}:</span> <span class="valor">${valor || '—'}</span></div>`
}

function fmtForma(p) {
  const mapa = { avista:'À Vista', financiado:'Financiado', troca:'Troca', troca_financiado:'Troca + Financiamento' }
  return mapa[p.forma_pagamento] || p.forma_pagamento
}

function descPagamento(p) {
  const linhas = []
  linhas.push(`<b>Forma:</b> ${fmtForma(p)}`)
  linhas.push(`<b>Valor total:</b> ${fmtR(p.valor_venda)}`)

  if (['financiado','troca_financiado'].includes(p.forma_pagamento)) {
    if (p.valor_entrada > 0) linhas.push(`<b>Entrada:</b> ${fmtR(p.valor_entrada)}`)
    if (p.banco_financiamento) linhas.push(`<b>Banco:</b> ${p.banco_financiamento}`)
    if (p.qtd_parcelas)   linhas.push(`<b>Parcelas:</b> ${p.qtd_parcelas}x de ${fmtR(p.valor_parcela)}`)
  }
  if (['troca','troca_financiado'].includes(p.forma_pagamento) && p.troca_placa) {
    linhas.push(`<b>Veículo em troca:</b> ${p.troca_marca || ''} ${p.troca_modelo || ''} ${p.troca_ano || ''} — Placa: ${p.troca_placa} — Valor: ${fmtR(p.troca_valor)}`)
  }
  return linhas.join('<br>')
}

// ── Gerador principal ──────────────────────────────────────────────────────────
export function gerarDocumento(processo, veiculo) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const cidade = 'Goiânia' // ← ajuste a cidade da empresa

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Compra e Venda — ${veiculo.placa || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #111;
    background: #fff;
    padding: 30px 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .topo { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .empresa-nome { font-size: 18px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
  .empresa-info { font-size: 10px; color: #444; margin-top: 4px; }
  h1 { font-size: 14px; text-align: center; letter-spacing: 2px; text-transform: uppercase;
       margin: 18px 0 14px; border: 2px solid #111; padding: 8px; }
  .secao { margin-bottom: 14px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }
  .secao-titulo { background: #111; color: #fff; font-size: 10px; font-weight: 700;
                  letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 10px; }
  .secao-corpo { padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .secao-corpo.full { grid-template-columns: 1fr; }
  .campo { font-size: 11px; padding: 2px 0; }
  .label { font-weight: 700; color: #333; }
  .valor { color: #111; }
  .clausulas { margin-bottom: 14px; }
  .clausulas p { font-size: 10px; color: #333; line-height: 1.6; margin-bottom: 6px; text-align: justify; }
  .clausulas p b { color: #111; }
  .assinaturas { margin-top: 40px; display: flex; justify-content: space-around; gap: 20px; }
  .assinatura { text-align: center; flex: 1; }
  .linha-assinatura { border-top: 1px solid #111; margin-bottom: 4px; }
  .assinatura small { font-size: 9px; color: #555; }
  .testemunhas { margin-top: 30px; display: flex; justify-content: space-around; gap: 20px; }
  .rodape { margin-top: 30px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
  .destaque { background: #f5f5f5; border-left: 3px solid #111; padding: 8px 10px; font-size: 11px; margin: 4px 0; }
  @media print {
    body { padding: 15mm 20mm; }
    button { display: none !important; }
  }
</style>
</head>
<body>

<!-- ── BOTÃO IMPRIMIR (some na impressão) ── -->
<div style="text-align:right;margin-bottom:16px;print:none">
  <button onclick="window.print()" style="background:#111;color:#fff;border:none;padding:8px 20px;font-size:12px;cursor:pointer;border-radius:4px;font-family:Arial">
    🖨️ Imprimir / Salvar PDF
  </button>
</div>

<!-- ── CABEÇALHO DA EMPRESA ── -->
<div class="topo">
  <!-- ↓↓↓ AJUSTE OS DADOS DA EMPRESA AQUI ↓↓↓ -->
  <div class="empresa-nome">CLV Veículos Comerciais</div>
  <div class="empresa-info">
    CNPJ: XX.XXX.XXX/XXXX-XX &nbsp;|&nbsp; Endereço: Rua Exemplo, 123 — ${cidade}/GO
    <br>Telefone: (62) XXXX-XXXX &nbsp;|&nbsp; E-mail: contato@clvveiculos.com.br
  </div>
</div>

<h1>Instrumento Particular de Compra e Venda de Veículo Automotor</h1>

<!-- ── VENDEDOR ── -->
<div class="secao">
  <div class="secao-titulo">1. Vendedor</div>
  <div class="secao-corpo">
    ${linha('Razão Social / Nome', 'CLV Veículos Comerciais')}
    ${linha('CNPJ', 'XX.XXX.XXX/XXXX-XX')}
    ${linha('Endereço', 'Rua Exemplo, 123 — ' + cidade + '/GO')}
    ${linha('Representante', processo.vendedor_nome || '—')}
  </div>
</div>

<!-- ── COMPRADOR ── -->
<div class="secao">
  <div class="secao-titulo">2. Comprador</div>
  <div class="secao-corpo">
    ${linha('Nome completo', processo.comprador_nome)}
    ${linha('CPF / CNPJ', processo.comprador_doc)}
    ${linha('Telefone', processo.comprador_telefone)}
    ${linha('E-mail', processo.comprador_email)}
    ${linha('Endereço', processo.comprador_endereco)}
  </div>
</div>

<!-- ── VEÍCULO ── -->
<div class="secao">
  <div class="secao-titulo">3. Dados do Veículo</div>
  <div class="secao-corpo">
    ${linha('Marca / Modelo', (veiculo.marca_nome || '') + ' ' + (veiculo.modelo_nome || veiculo.modelo || ''))}
    ${linha('Ano', veiculo.ano_modelo || veiculo.ano || '—')}
    ${linha('Placa', veiculo.placa)}
    ${linha('Cor', veiculo.cor)}
    ${linha('Combustível', veiculo.combustivel)}
    ${linha('KM atual', (veiculo.km || 0).toLocaleString('pt-BR') + ' km')}
    ${linha('Código FIPE', veiculo.codigo_fipe || '—')}
    ${linha('Tabela FIPE', veiculo.valor_fipe ? fmtR(veiculo.valor_fipe) : '—')}
  </div>
</div>

<!-- ── PAGAMENTO ── -->
<div class="secao">
  <div class="secao-titulo">4. Valor e Forma de Pagamento</div>
  <div class="secao-corpo full">
    <div class="destaque">${descPagamento(processo)}</div>
  </div>
</div>

${['troca','troca_financiado'].includes(processo.forma_pagamento) && processo.troca_placa ? `
<!-- ── VEÍCULO EM TROCA ── -->
<div class="secao">
  <div class="secao-titulo">5. Veículo Recebido em Troca</div>
  <div class="secao-corpo">
    ${linha('Marca / Modelo', (processo.troca_marca || '') + ' ' + (processo.troca_modelo || ''))}
    ${linha('Ano', processo.troca_ano)}
    ${linha('Placa', processo.troca_placa)}
    ${linha('Cor', processo.troca_cor)}
    ${linha('KM', (processo.troca_km || 0).toLocaleString('pt-BR') + ' km')}
    ${linha('Valor acordado', fmtR(processo.troca_valor))}
  </div>
</div>` : ''}

<!-- ── CLÁUSULAS ── -->
<div class="clausulas">
  <p><b>Cláusula 1ª — Da transferência de propriedade:</b> O(A) VENDEDOR(A) declara ser o(a) legítimo(a) proprietário(a) do veículo descrito acima e, pelo presente instrumento, transfere ao(à) COMPRADOR(A) a plena e irrevogável propriedade do mesmo, nas condições aqui estabelecidas.</p>
  <p><b>Cláusula 2ª — Do estado do veículo:</b> O veículo é vendido no estado em que se encontra, sendo de conhecimento do(a) COMPRADOR(A) suas condições gerais, ressalvadas as garantias legais previstas no Código de Defesa do Consumidor.</p>
  <p><b>Cláusula 3ª — Da documentação:</b> O(A) VENDEDOR(A) obriga-se a fornecer ao(à) COMPRADOR(A) todos os documentos necessários para a transferência do veículo junto ao DETRAN, no prazo de 30 (trinta) dias úteis após a assinatura deste contrato, salvo motivo de força maior devidamente comprovado.</p>
  <p><b>Cláusula 4ª — Do pagamento:</b> O(A) COMPRADOR(A) obriga-se a efetuar o pagamento conforme a forma acordada na Cláusula 4, sendo que a inadimplência por prazo superior a 30 (trinta) dias acarretará rescisão automática deste instrumento, com devolução do veículo e das parcelas pagas, descontadas as despesas comprovadas.</p>
  <p><b>Cláusula 5ª — Da entrega:</b> A entrega do veículo ocorrerá somente após a confirmação de todas as etapas do processo de venda, incluindo aprovação de financiamento (quando aplicável), vistoria cautelar e quitação integral ou liberação de crédito pelo agente financeiro.</p>
  <p><b>Cláusula 6ª — Do foro:</b> Para dirimir quaisquer controvérsias oriundas do presente instrumento, as partes elegem o foro da comarca de ${cidade}/GO, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
</div>

<!-- ── ASSINATURAS ── -->
<div style="margin-top:8px;font-size:10px;text-align:center;color:#555">
  ${cidade}, ${hoje}
</div>

<div class="assinaturas">
  <div class="assinatura">
    <div style="height:50px"></div>
    <div class="linha-assinatura"></div>
    <div><b>VENDEDOR</b></div>
    <small>CLV Veículos Comerciais</small><br>
    <small>${processo.vendedor_nome || ''}</small>
  </div>
  <div class="assinatura">
    <div style="height:50px"></div>
    <div class="linha-assinatura"></div>
    <div><b>COMPRADOR</b></div>
    <small>${processo.comprador_nome || ''}</small><br>
    <small>CPF/CNPJ: ${processo.comprador_doc || ''}</small>
  </div>
</div>

<div class="testemunhas" style="margin-top:30px">
  <div class="assinatura">
    <div style="height:40px"></div>
    <div class="linha-assinatura"></div>
    <div style="font-size:10px"><b>TESTEMUNHA 1</b></div>
    <small>Nome: _________________________</small><br>
    <small>CPF: __________________________</small>
  </div>
  <div class="assinatura">
    <div style="height:40px"></div>
    <div class="linha-assinatura"></div>
    <div style="font-size:10px"><b>TESTEMUNHA 2</b></div>
    <small>Nome: _________________________</small><br>
    <small>CPF: __________________________</small>
  </div>
</div>

<div class="rodape">
  Documento gerado em ${hoje} pelo sistema FleetControl v3.9 — CLV Veículos Comerciais<br>
  Este documento tem validade jurídica quando assinado por ambas as partes e testemunhas.
</div>

</body>
</html>`
}

/** Abre o documento em nova aba e inicia impressão */
export function imprimirDocumento(processo, veiculo) {
  const html = gerarDocumento(processo, veiculo)
  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para gerar o documento.'); return }
  w.document.write(html)
  w.document.close()
}
