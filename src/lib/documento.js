/**
 * documento.js — Contrato CLV: Instrumento Particular de Compromisso de Compra e Venda
 * Dados da empresa fixos (CNPJ, endereço, foro).
 * Comprador diferenciado automaticamente por CPF (PF) vs CNPJ (PJ).
 * Forma de pagamento: à vista, financiado, troca, troca+financiado.
 */
import { fmtR } from './constants'

// ── Helpers ───────────────────────────────────────────────────────────────────

function somenteDigitos(v) { return (v || '').replace(/\D/g, '') }
function isPJ(doc) { return somenteDigitos(doc).length === 14 }

function dataExtenso() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function qualificacaoComprador(p) {
  const nome = p.comprador_nome || '—'
  const doc  = p.comprador_doc  || ''
  const end  = p.comprador_endereco || '—'

  if (isPJ(doc)) {
    return `<b>${nome}</b>, Pessoa Jurídica de direito privado, inscrita no CNPJ nº <b>${doc}</b>, com sede em <b>${end}</b>`
  }
  return `<b>${nome}</b>, Pessoa Física, portador(a) do CPF nº <b>${doc}</b>, residente e domiciliado(a) em <b>${end}</b>`
}

function textoPagamento(p) {
  const total = fmtR(p.valor_venda || 0)

  if (p.forma_pagamento === 'avista') {
    return `<b>R$ ${p.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'} (${total}), à vista</b>`
  }

  if (p.forma_pagamento === 'financiado') {
    const entrada = p.valor_entrada > 0 ? `, com entrada de ${fmtR(p.valor_entrada)}` : ''
    const parc    = p.qtd_parcelas  > 0 ? `, saldo financiado em <b>${p.qtd_parcelas}x de ${fmtR(p.valor_parcela)}</b> via ${p.banco_financiamento || '—'}` : ''
    return `<b>${total}</b>${entrada}${parc}`
  }

  if (p.forma_pagamento === 'troca' && p.troca_placa) {
    const complemento = (p.valor_venda || 0) - (p.troca_valor || 0)
    const compTxt = complemento > 0
      ? `, mais complemento em dinheiro de <b>${fmtR(complemento)}</b> à vista`
      : ''
    return `Mediante troca do veículo <b>${p.troca_marca || ''} ${p.troca_modelo || ''}</b> Ano: <b>${p.troca_ano || '—'}</b>, Placa: <b>${p.troca_placa}</b>, avaliado em <b>${fmtR(p.troca_valor || 0)}</b>${compTxt}. Valor total da transação: <b>${total}</b>`
  }

  if (p.forma_pagamento === 'troca_financiado' && p.troca_placa) {
    const parc = p.qtd_parcelas > 0 ? `, com saldo financiado em <b>${p.qtd_parcelas}x de ${fmtR(p.valor_parcela)}</b> via ${p.banco_financiamento || '—'}` : ''
    return `Mediante troca do veículo <b>${p.troca_marca || ''} ${p.troca_modelo || ''}</b> Ano: <b>${p.troca_ano || '—'}</b>, Placa: <b>${p.troca_placa}</b>, avaliado em <b>${fmtR(p.troca_valor || 0)}</b>, com entrada de <b>${fmtR(p.valor_entrada || 0)}</b>${parc}. Valor total da transação: <b>${total}</b>`
  }

  return `<b>${total}</b>`
}

// ── Gerador principal ──────────────────────────────────────────────────────────

export function gerarDocumento(processo, veiculo) {
  const marca    = veiculo.marca_nome  || '—'
  const modelo   = veiculo.modelo_nome || veiculo.modelo || '—'
  const hoje     = dataExtenso()

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato CLV — ${veiculo.placa || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11.5px;
    color: #111;
    background: #fff;
    padding: 28px 44px;
    max-width: 820px;
    margin: 0 auto;
    line-height: 1.55;
  }
  .topo { text-align: center; margin-bottom: 16px; border-bottom: 3px double #111; padding-bottom: 12px; }
  .empresa-nome { font-size: 17px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
  .empresa-sub  { font-size: 10px; color: #555; margin-top: 3px; }
  h1 {
    font-size: 12.5px; text-align: center; letter-spacing: 2px; text-transform: uppercase;
    margin: 16px 0 18px; border: 2px solid #111; padding: 7px;
  }
  .corpo { text-align: justify; margin-bottom: 16px; }
  .clausulas { margin-bottom: 12px; }
  .clausulas p { margin-bottom: 9px; text-align: justify; font-size: 11px; }
  .veiculo-box {
    border: 1px solid #999; border-radius: 3px; padding: 8px 14px;
    margin: 14px 0; background: #fafafa;
    display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px;
  }
  .veiculo-box .campo { font-size: 11px; }
  .veiculo-box .label { font-weight: 700; }
  .pagamento-box {
    border-left: 4px solid #111; padding: 8px 12px; margin: 12px 0;
    background: #f5f5f5; font-size: 11.5px;
  }
  .assinaturas { margin-top: 44px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .assinatura  { text-align: center; }
  .linha-ass   { border-top: 1px solid #111; margin-bottom: 5px; }
  .assinatura small { font-size: 10px; color: #444; display: block; }
  .testemunhas { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .rodape { margin-top: 28px; font-size: 9px; color: #999; text-align: center;
            border-top: 1px solid #ddd; padding-top: 8px; }
  @media print {
    body { padding: 10mm 18mm; }
    .btn-imprimir { display: none !important; }
  }
</style>
</head>
<body>

<div class="btn-imprimir" style="text-align:right;margin-bottom:14px">
  <button onclick="window.print()"
    style="background:#111;color:#fff;border:none;padding:8px 22px;font-size:12px;cursor:pointer;border-radius:4px">
    🖨️ Imprimir / Salvar PDF
  </button>
</div>

<div class="topo">
  <div class="empresa-nome">CLV – Veículos de Cargas Leves e Vans Ltda</div>
  <div class="empresa-sub">
    CNPJ: 24.934.998/0001-60 &nbsp;|&nbsp; Rua Maria Daffre, nº 442, Vila Prudente — São Paulo/SP
  </div>
</div>

<h1>Instrumento Particular de Compromisso de Compra e Venda</h1>

<div class="corpo">
  <p>
    Pelo presente Instrumento Particular de Compromisso de Compra e Venda, de um lado
    <b>CLV – VEICULOS DE CARGAS LEVES E VANS LTDA</b>, Pessoa Jurídica de direito privado,
    devidamente inscrita no C.N.P.J. sob n° <b>24.934.998/0001-60</b>, sediada na capital
    <b>SÃO PAULO</b>, estabelecida na <b>RUA MARIA DAFFRE, Nº 442, VILA PRUDENTE</b>, de ora
    em diante chamada simplesmente de <b>COMPROMITENTE VENDEDOR</b>, e de outro lado o(a):
  </p>

  <p style="margin:12px 0 12px 20px">
    ${qualificacaoComprador(processo)},
    de ora em diante chamado(a) simplesmente de <b>COMPROMITENTE COMPRADOR(A)</b>.
  </p>

  <p>
    Têm, entre si, como justo e contratado o quanto segue, em relação ao veículo descrito abaixo:
  </p>
</div>

<div class="veiculo-box">
  <div class="campo"><span class="label">Marca:</span> ${marca}</div>
  <div class="campo"><span class="label">Modelo:</span> ${modelo}</div>
  <div class="campo"><span class="label">Cor:</span> ${veiculo.cor || '—'}</div>
  <div class="campo"><span class="label">Ano:</span> ${veiculo.ano_modelo || '—'}</div>
  <div class="campo"><span class="label">Placa:</span> ${veiculo.placa || '—'}</div>
  <div class="campo"><span class="label">Chassi:</span> ${veiculo.chassi || '—'}</div>
  <div class="campo"><span class="label">RENAVAM:</span> ${veiculo.renavam || '—'}</div>
  <div class="campo"><span class="label">Combustível:</span> ${veiculo.combustivel || '—'}</div>
</div>

<div style="margin-bottom:16px;font-size:11.5px">
  <b>Pago da seguinte forma:</b>
  <div class="pagamento-box">${textoPagamento(processo)}</div>
</div>

${['troca','troca_financiado'].includes(processo.forma_pagamento) && processo.troca_placa ? `
<div style="margin-bottom:16px;font-size:11px;border:1px solid #ccc;border-radius:3px;padding:8px 14px">
  <b>Veículo recebido em troca:</b>
  ${processo.troca_marca || ''} ${processo.troca_modelo || ''} — Placa: ${processo.troca_placa}
  — Ano: ${processo.troca_ano || '—'} — Cor: ${processo.troca_cor || '—'}
  — KM: ${(processo.troca_km || 0).toLocaleString('pt-BR')} — Valor: ${fmtR(processo.troca_valor || 0)}
</div>` : ''}

<div class="clausulas">
  <p><b>1º.</b> Nós, da CLV Multimarcas, agradecemos a sua preferência e, pensando em sua plena satisfação, estamos entregando o seu veículo revisado e com garantia. Lembrando que o veículo é USADO e é vendido no ESTADO em que se encontra, devendo ser vistoriado pelo comprador ou profissional de sua confiança. A CLV Multimarcas garante o veículo acima pelo prazo de 90 (NOVENTA) DIAS, contados da data de entrega, desde que sejam atendidas as condições NORMAIS DE USO, sendo que qualquer serviço referente à garantia deverá ser feito diretamente em nossa oficina ou terceiro indicado por esta. Caso o comprador tome a iniciativa de fazer os reparos pertencentes à garantia oferecida, estará automaticamente renunciando à mesma.</p>

  <p><b>2º.</b> A partir desta data, o(a) COMPROMITENTE COMPRADOR(A) assume total responsabilidade por multas e débitos de qualquer natureza, e/ou outros delitos que vierem a recair sobre o veículo, inclusive aqueles anteriores à data desta assinatura que não tenham sido informados pelo COMPROMITENTE VENDEDOR.</p>

  <p><b>3º.</b> A CLV Multimarcas não fornece garantia nos equipamentos de Carroceria, Baú, Refrigeração, hidráulicos ou qualquer outro sistema operacional equipado no veículo.</p>

  <p><b>4º.</b> O(A) COMPROMITENTE VENDEDOR(A) declara que sobre o bem não há quaisquer ônus ou litígios, penhoras ou arrestos, sequestros, multas ou débitos de qualquer natureza, responsabilizando-se civil e criminalmente pela procedência e legitimidade do veículo.</p>

  <p><b>5º.</b> Para serem dirimidas quaisquer dúvidas ou litígios relativos ao presente instrumento, fica eleito desde já o <b>FORO REGIONAL DE VILA PRUDENTE</b>, com renúncia de qualquer outro, por mais privilegiado que seja.</p>
</div>

<p style="text-align:center;margin-top:20px;font-size:11px">
  São Paulo, ${hoje}
</p>

<div class="assinaturas">
  <div class="assinatura">
    <div style="height:52px"></div>
    <div class="linha-ass"></div>
    <small><b>COMPROMITENTE VENDEDOR</b></small>
    <small>CLV VEICULOS DE CARGAS LEVES E VANS LTDA</small>
    <small>CNPJ: 24.934.998/0001-60</small>
    ${processo.vendedor_nome ? `<small>Repr.: ${processo.vendedor_nome}</small>` : ''}
  </div>
  <div class="assinatura">
    <div style="height:52px"></div>
    <div class="linha-ass"></div>
    <small><b>COMPROMITENTE COMPRADOR(A)</b></small>
    <small>${processo.comprador_nome || ''}</small>
    <small>${isPJ(processo.comprador_doc) ? 'CNPJ' : 'CPF'}: ${processo.comprador_doc || ''}</small>
  </div>
</div>

<div class="testemunhas">
  <div class="assinatura">
    <div style="height:40px"></div>
    <div class="linha-ass"></div>
    <small><b>TESTEMUNHA 1</b></small>
    <small>Nome: ________________________________</small>
    <small>CPF: _________________________________</small>
  </div>
  <div class="assinatura">
    <div style="height:40px"></div>
    <div class="linha-ass"></div>
    <small><b>TESTEMUNHA 2</b></small>
    <small>Nome: ________________________________</small>
    <small>CPF: _________________________________</small>
  </div>
</div>

<div class="rodape">
  Documento gerado em ${hoje} pelo sistema Dashboard CLV — uso interno<br>
  Válido somente quando assinado por ambas as partes e duas testemunhas.
</div>

</body>
</html>`
}

/** Abre o contrato em nova aba e inicia impressão */
export function imprimirDocumento(processo, veiculo) {
  const html = gerarDocumento(processo, veiculo)
  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para gerar o contrato.'); return }
  w.document.write(html)
  w.document.close()
}

/** Gera Blob HTML para upload no Supabase Storage */
export function gerarBlobContrato(processo, veiculo) {
  return new Blob([gerarDocumento(processo, veiculo)], { type: 'text/html' })
}
