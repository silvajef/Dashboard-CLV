/**
 * ProcessoVenda.jsx — Componentes do processo de venda
 * v3.9 — ModalIniciarVenda (wizard 3 passos) + EtapasProcesso (tracking inline)
 */
import { useState } from 'react'
import { Modal, Btn } from './UI'
import { MoedaInput, UpperInput, DocInput } from './Inputs'
import {
  C, fmtR, fmtData, today,
  FORMAS_PAGAMENTO, criarEtapas, progressoProcesso,
} from '../lib/constants'
import { imprimirDocumento } from '../lib/documento'
import { useBreakpoint } from '../lib/responsive'

/* ── helpers ─────────────────────────────────────────────────────────────── */
const inp = (extra = {}) => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  ...extra,
})

function Campo({ label, required, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function SecHead({ title, cor }) {
  return (
    <div style={{ fontSize: 11, color: cor || C.amber, fontWeight: 700, letterSpacing: 1, marginBottom: 12, marginTop: 4 }}>
      {title}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ModalIniciarVenda — Wizard 3 passos
════════════════════════════════════════════════════════════════════════════ */
export function ModalIniciarVenda({ veiculo, onSave, onClose, loading }) {
  const { isMobile } = useBreakpoint()
  const [passo, setPasso] = useState(1)
  const [f, setF] = useState({
    // Comprador
    comprador_nome:     '',
    comprador_doc:      '',
    comprador_telefone: '',
    comprador_email:    '',
    comprador_endereco: '',
    // Vendedor
    vendedor_nome:  '',
    comissao_pct:   0,
    // Valores
    valor_venda:    veiculo.valor_anuncio || veiculo.valor_compra || 0,
    valor_entrada:  0,
    // Pagamento
    forma_pagamento:    'avista',
    banco_financiamento:'',
    qtd_parcelas:       0,
    valor_parcela:      0,
    // Troca
    troca_placa:  '',
    troca_marca:  '',
    troca_modelo: '',
    troca_ano:    '',
    troca_km:     0,
    troca_cor:    '',
    troca_valor:  0,
  })

  const set    = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setUp  = (k, v) => set(k, (v || '').toUpperCase())

  const temFinanciamento = ['financiado', 'troca_financiado'].includes(f.forma_pagamento)
  const temTroca         = ['troca', 'troca_financiado'].includes(f.forma_pagamento)
  const cols2            = isMobile ? '1fr' : '1fr 1fr'

  const etapasPreview = criarEtapas(f.forma_pagamento)

  const handleIniciar = () => {
    onSave({
      veiculo_id:             veiculo.id,
      status_veiculo_anterior: veiculo.status,
      etapas:                 etapasPreview,
      status:                 'em_andamento',
      ...f,
    })
  }

  const canNext1 = f.comprador_nome.trim().length > 0
  const canNext2 = f.valor_venda > 0

  /* ── Barra de passos ── */
  const Passos = () => (
    <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
      {['Comprador', 'Pagamento', 'Etapas'].map((label, i) => {
        const n = i + 1
        const ativo = passo === n
        const done  = passo > n
        return (
          <div key={n} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 3,
              background: done ? C.green : ativo ? C.amber : C.border,
              marginBottom: 6,
              transition: 'background .2s',
            }}/>
            <div style={{ fontSize: 10, color: done ? C.green : ativo ? C.amber : C.muted, fontWeight: ativo || done ? 700 : 400 }}>
              {done ? '✓' : n}. {label}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <Modal title={`Iniciar Venda — ${veiculo.marca_nome || ''} ${veiculo.modelo_nome || ''} · ${veiculo.placa || ''}`} wide onClose={onClose}>
      <Passos />

      {/* ── PASSO 1: COMPRADOR + VENDEDOR ── */}
      {passo === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SecHead title="👤 DADOS DO COMPRADOR" cor={C.blue}/>
          <div style={{ display: 'grid', gridTemplateColumns: cols2, gap: 14 }}>
            <Campo label="Nome completo" required>
              <UpperInput value={f.comprador_nome} onChange={v => setUp('comprador_nome', v)} placeholder="NOME OU RAZÃO SOCIAL"/>
            </Campo>
            <Campo label="CPF / CNPJ">
              <DocInput value={f.comprador_doc} onChange={v => set('comprador_doc', v)}/>
            </Campo>
            <Campo label="Telefone">
              <input style={inp()} value={f.comprador_telefone} placeholder="(62) 9XXXX-XXXX"
                onChange={e => set('comprador_telefone', e.target.value)}/>
            </Campo>
            <Campo label="E-mail">
              <input style={inp()} type="email" value={f.comprador_email} placeholder="email@exemplo.com"
                onChange={e => set('comprador_email', e.target.value.toLowerCase())}/>
            </Campo>
          </div>
          <Campo label="Endereço completo">
            <UpperInput value={f.comprador_endereco} onChange={v => setUp('comprador_endereco', v)} placeholder="RUA, NÚMERO, BAIRRO — CIDADE/UF"/>
          </Campo>

          <div style={{ height: 1, background: C.border, margin: '4px 0' }}/>
          <SecHead title="🧑‍💼 VENDEDOR / COMISSÃO" cor={C.purple}/>
          <div style={{ display: 'grid', gridTemplateColumns: cols2, gap: 14 }}>
            <Campo label="Nome do Vendedor">
              <UpperInput value={f.vendedor_nome} onChange={v => setUp('vendedor_nome', v)} placeholder="NOME DO VENDEDOR"/>
            </Campo>
            <Campo label="Comissão (% sobre lucro bruto)">
              <div style={{ position: 'relative' }}>
                <input type="text" inputMode="numeric" value={f.comissao_pct || ''}
                  onChange={e => set('comissao_pct', parseFloat(e.target.value.replace(/[^0-9.]/g,'')) || 0)}
                  placeholder="0"
                  style={inp({ color: C.purple, border: `1px solid ${C.purple}66`, paddingRight: 36 })}/>
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:C.purple, fontWeight:700 }}>%</span>
              </div>
            </Campo>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Btn>
            <Btn style={{ flex: 1 }} onClick={() => setPasso(2)} disabled={!canNext1}>
              Próximo: Pagamento →
            </Btn>
          </div>
        </div>
      )}

      {/* ── PASSO 2: PAGAMENTO ── */}
      {passo === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SecHead title="💰 FORMA DE PAGAMENTO" cor={C.amber}/>

          {/* Forma de pagamento — botões */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {FORMAS_PAGAMENTO.map(fp => (
              <button key={fp.value} onClick={() => set('forma_pagamento', fp.value)}
                style={{
                  background: f.forma_pagamento === fp.value ? `${C.amber}22` : C.surface,
                  border: `1px solid ${f.forma_pagamento === fp.value ? C.amber : C.border}`,
                  borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                  color: f.forma_pagamento === fp.value ? C.amber : C.muted,
                  fontWeight: f.forma_pagamento === fp.value ? 700 : 400,
                  fontSize: 13, fontFamily: 'inherit', textAlign: 'center',
                }}>
                {fp.label}
              </button>
            ))}
          </div>

          <MoedaInput label="Valor Total da Venda (R$)" required value={f.valor_venda} onChange={v => set('valor_venda', v)} highlight={C.green}/>

          {/* Financiamento */}
          {temFinanciamento && (
            <div style={{ background: `${C.blue}10`, border: `1px solid ${C.blue}33`, borderRadius: 10, padding: 14 }}>
              <SecHead title="🏦 DADOS DO FINANCIAMENTO" cor={C.blue}/>
              <div style={{ display: 'grid', gridTemplateColumns: cols2, gap: 14 }}>
                <MoedaInput label="Valor de Entrada (R$)" value={f.valor_entrada} onChange={v => set('valor_entrada', v)} highlight={C.blue}/>
                <Campo label="Banco / Financeira">
                  <UpperInput value={f.banco_financiamento} onChange={v => setUp('banco_financiamento', v)} placeholder="EX: BRADESCO, ITAÚ, BANCO DO BRASIL"/>
                </Campo>
                <Campo label="Nº de Parcelas">
                  <input type="text" inputMode="numeric" value={f.qtd_parcelas || ''}
                    onChange={e => set('qtd_parcelas', parseInt(e.target.value.replace(/\D/g,''),10)||0)}
                    placeholder="Ex: 48"
                    style={inp({ fontFamily:"'JetBrains Mono',monospace", fontWeight:700 })}/>
                </Campo>
                <MoedaInput label="Valor por Parcela (R$)" value={f.valor_parcela} onChange={v => set('valor_parcela', v)} highlight={C.blue}/>
              </div>
              {f.qtd_parcelas > 0 && f.valor_parcela > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.blue, fontWeight: 700 }}>
                  Total financiado: {fmtR(f.qtd_parcelas * f.valor_parcela)}
                  {f.valor_entrada > 0 && ` (+ ${fmtR(f.valor_entrada)} de entrada)`}
                </div>
              )}
            </div>
          )}

          {/* Troca */}
          {temTroca && (
            <div style={{ background: `${C.orange}10`, border: `1px solid ${C.orange}44`, borderRadius: 10, padding: 14 }}>
              <SecHead title="🔄 VEÍCULO RECEBIDO EM TROCA" cor={C.orange}/>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                Este veículo será incluído automaticamente no estoque ao concluir o processo.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: cols2, gap: 14 }}>
                <Campo label="Placa" required>
                  <UpperInput value={f.troca_placa} onChange={v => setUp('troca_placa', v)} placeholder="ABC-1234"/>
                </Campo>
                <MoedaInput label="Valor da Troca (R$)" value={f.troca_valor} onChange={v => set('troca_valor', v)} highlight={C.orange}/>
                <Campo label="Marca">
                  <UpperInput value={f.troca_marca} onChange={v => setUp('troca_marca', v)} placeholder="VOLKSWAGEN"/>
                </Campo>
                <Campo label="Modelo">
                  <UpperInput value={f.troca_modelo} onChange={v => setUp('troca_modelo', v)} placeholder="DELIVERY 9.170"/>
                </Campo>
                <Campo label="Ano">
                  <UpperInput value={f.troca_ano} onChange={v => setUp('troca_ano', v)} placeholder="2022/2023"/>
                </Campo>
                <Campo label="Cor">
                  <UpperInput value={f.troca_cor} onChange={v => setUp('troca_cor', v)} placeholder="BRANCO"/>
                </Campo>
                <Campo label="KM">
                  <input type="text" inputMode="numeric"
                    value={(f.troca_km||0).toLocaleString('pt-BR')}
                    onChange={e => set('troca_km', parseInt(e.target.value.replace(/\D/g,''),10)||0)}
                    style={inp({ fontFamily:"'JetBrains Mono',monospace", fontWeight:700 })}/>
                </Campo>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setPasso(1)}>← Voltar</Btn>
            <Btn style={{ flex: 1 }} onClick={() => setPasso(3)} disabled={!canNext2}>
              Próximo: Etapas →
            </Btn>
          </div>
        </div>
      )}

      {/* ── PASSO 3: ETAPAS + CONFIRMAÇÃO ── */}
      {passo === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SecHead title="📋 ETAPAS DO PROCESSO" cor={C.amber}/>
          <p style={{ fontSize: 12, color: C.muted }}>
            As etapas abaixo serão criadas automaticamente e você poderá marcá-las como concluídas
            conforme o processo avança.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {etapasPreview.map((e, i) => (
              <div key={e.tipo} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.muted, flexShrink: 0 }}>{i+1}</span>
                <span style={{ fontSize: 14 }}>{e.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</span>
              </div>
            ))}
          </div>

          {/* Resumo da venda */}
          <div style={{ background: C.cardHi, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ background: C.subtle, padding: '8px 14px', fontSize: 10, color: C.amber, fontWeight: 700, letterSpacing: 1 }}>
              📊 RESUMO DA VENDA
            </div>
            {[
              ['Comprador',      f.comprador_nome || '—'],
              ['Documento',      f.comprador_doc  || '—'],
              ['Forma pagto.',   FORMAS_PAGAMENTO.find(fp => fp.value === f.forma_pagamento)?.label],
              ['Valor da venda', fmtR(f.valor_venda)],
              ...(temFinanciamento && f.qtd_parcelas ? [[`Parcelas`, `${f.qtd_parcelas}x de ${fmtR(f.valor_parcela)}`]] : []),
              ...(temTroca && f.troca_placa ? [['Troca', `${f.troca_placa} — ${fmtR(f.troca_valor)}`]] : []),
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setPasso(2)}>← Voltar</Btn>
            <Btn variant="success" style={{ flex: 2 }} onClick={handleIniciar} disabled={loading}>
              {loading ? 'Salvando...' : '🏷 Iniciar Processo de Venda'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EtapasProcesso — Tracking inline nas abas de detalhe do veículo
════════════════════════════════════════════════════════════════════════════ */
export function EtapasProcesso({ processo, veiculo, onSave, onConcluir, onCancelar, saving }) {
  const { concluidas, total, pct } = progressoProcesso(processo.etapas)
  const todasConcluidas = concluidas === total && total > 0

  const marcarEtapa = (index) => {
    const novasEtapas = processo.etapas.map((e, i) => {
      if (i !== index) return e
      const concluido = !e.concluido
      return { ...e, concluido, concluido_em: concluido ? today() : null }
    })
    onSave({ ...processo, etapas: novasEtapas })
  }

  const corPct = pct === 100 ? C.green : pct >= 60 ? C.amber : C.blue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Barra de progresso */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Progresso do Processo</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: corPct, fontFamily: "'JetBrains Mono',monospace" }}>
            {pct}%
          </div>
        </div>
        <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, background: corPct, height: '100%', borderRadius: 4, transition: 'width .4s ease' }}/>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          {concluidas} de {total} etapa{total !== 1 ? 's' : ''} concluída{concluidas !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de etapas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {processo.etapas.map((etapa, i) => (
          <div key={etapa.tipo} style={{
            background: etapa.concluido ? `${C.green}10` : C.card,
            border: `1px solid ${etapa.concluido ? C.green + '44' : C.border}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'all .15s',
          }} onClick={() => !saving && marcarEtapa(i)}>
            {/* Checkbox */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: etapa.concluido ? C.green : 'transparent',
              border: `2px solid ${etapa.concluido ? C.green : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {etapa.concluido && <span style={{ fontSize: 12, color: '#000', fontWeight: 900 }}>✓</span>}
            </div>

            {/* Ícone + label */}
            <span style={{ fontSize: 18, flexShrink: 0 }}>{etapa.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: etapa.concluido ? 600 : 400, color: etapa.concluido ? C.green : C.text,
                textDecoration: etapa.concluido ? 'none' : 'none' }}>
                {etapa.label}
              </div>
              {etapa.concluido && etapa.concluido_em && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Concluído em {fmtData(etapa.concluido_em)}
                </div>
              )}
            </div>

            {/* Nº */}
            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{i+1}/{total}</span>
          </div>
        ))}
      </div>

      {/* Dados do comprador e pagamento */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: C.subtle, padding: '8px 14px', fontSize: 10, color: C.amber, fontWeight: 700, letterSpacing: 1 }}>
          📊 DADOS DA VENDA
        </div>
        {[
          ['Comprador',  processo.comprador_nome],
          ['Documento',  processo.comprador_doc],
          ['Telefone',   processo.comprador_telefone],
          ['Pagamento',  (() => {
            const fp = { avista:'À Vista', financiado:'Financiado', troca:'Troca', troca_financiado:'Troca + Financiamento' }
            return fp[processo.forma_pagamento] || processo.forma_pagamento
          })()],
          ['Valor Venda', fmtR(processo.valor_venda)],
          ...(['financiado','troca_financiado'].includes(processo.forma_pagamento) && processo.banco_financiamento
            ? [['Banco', processo.banco_financiamento]] : []),
          ...(['financiado','troca_financiado'].includes(processo.forma_pagamento) && processo.qtd_parcelas
            ? [[`Parcelas`, `${processo.qtd_parcelas}x de ${fmtR(processo.valor_parcela)}`]] : []),
          ...(['troca','troca_financiado'].includes(processo.forma_pagamento) && processo.troca_placa
            ? [['Troca', `${processo.troca_placa} — ${fmtR(processo.troca_valor)}`]] : []),
          ...(processo.vendedor_nome ? [['Vendedor', processo.vendedor_nome]] : []),
          ...(processo.comissao_pct  ? [['Comissão', `${processo.comissao_pct}%`]] : []),
        ].map(([l, v]) => v ? (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
          </div>
        ) : null)}
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn variant="secondary" style={{ flex: 1 }} disabled={saving}
          onClick={() => imprimirDocumento(processo, veiculo)}>
          📄 Gerar Documento
        </Btn>
        <Btn variant="danger" style={{ flex: 1 }} disabled={saving}
          onClick={() => onCancelar({ processoId: processo.id, veiculoId: veiculo.id, statusAnterior: processo.status_veiculo_anterior })}>
          ✕ Cancelar Processo
        </Btn>
      </div>

      {todasConcluidas && (
        <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>
            ✅ Todas as etapas concluídas!
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
            O veículo será marcado como <b>Vendido</b> e, se houver troca, o veículo recebido entrará no estoque.
          </div>
          <Btn variant="success" onClick={() => onConcluir({ processoId: processo.id, processo, veiculo })} disabled={saving}>
            {saving ? 'Finalizando...' : '🏁 Concluir Venda'}
          </Btn>
        </div>
      )}
    </div>
  )
}
