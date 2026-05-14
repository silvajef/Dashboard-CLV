# CLAUDE.md

## Code style

- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 grep hits in the codebase.
- Types: explicit. No `any`, no `Dict`, no untyped functions.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.

## Comments

- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.

## Tests

- Tests run with a single command: `<project-specific>`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.

## Dependencies

- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.

## Project structure

Entry point: `index.html` → `src/main.jsx` → `src/App.jsx`.
**Todo código da aplicação vive em `src/`.** Arquivos JS/JSX na raiz são ignorados pelo build.

```
src/
├── main.jsx              ← entrada do Vite
├── App.jsx               ← layout, nav, roteamento por aba
├── components/           ← componentes reutilizáveis
├── hooks/                ← hooks de estado (useFleetData, useAnuncios, useLeads…)
├── lib/
│   ├── api.js            ← CRUD Supabase principal
│   ├── api-anuncios.js   ← CRUD anúncios e integrações OAuth
│   ├── api-leads.js      ← CRUD leads e atividades
│   ├── plataformas/      ← adaptadores por plataforma (ML real, stubs: OLX, iCarros…)
│   ├── constants.js      ← cores (C), formatadores, constantes de status
│   └── supabase.js       ← cliente Supabase
└── pages/                ← uma página por aba do nav
```

Ao adicionar uma nova aba:
1. Crie `src/pages/NomePagina.jsx`
2. Importe e adicione em `TABS_BASE` dentro de `src/App.jsx`
3. Adicione o case de renderização no bloco `{abaAtual===...}` do `<main>`

## Structure

- Follow the framework's convention (Rails, Django, Next.js, etc.).
- Prefer small focused modules over god files.
- Predictable paths: controller/model/view, src/lib/test, etc.

## Formatting

- Use the language default formatter (`cargo fmt`, `gofmt`, `prettier`,
  `black`, `rubocop -A`). Don't discuss style beyond that.

## Logging

- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.

---

## Design system

### Princípios

- Todo estilo é **inline** via objetos JS (`style={{}}`). Não usar classes CSS externas nem CSS Modules.
- Nunca inventar valores de cor, raio ou espaçamento. Usar **sempre** os tokens de `src/lib/constants.js` (`C.*`) e `src/lib/responsive.js` (`BP.*`, `useBreakpoint`).
- Componentes visuais novos devem ser copiáveis a partir dos padrões abaixo sem abrir outra página para referência.

---

### Paleta — objeto `C` (`src/lib/constants.js`)

| Token | Hex | Uso |
|---|---|---|
| `C.bg` | `#08090d` | Fundo da página |
| `C.surface` | `#0e1018` | Nav, header, overlays |
| `C.card` | `#12151e` | Cards, painéis |
| `C.cardHi` | `#171c28` | Card em hover / selecionado |
| `C.border` | `#1c2030` | Bordas padrão |
| `C.borderHi` | `#2a3050` | Bordas em foco/hover |
| `C.text` | `#e8edf8` | Texto principal |
| `C.muted` | `#8b95b0` | Labels, subtítulos |
| `C.faint` | `#636b85` | Placeholders, "Em breve" |
| `C.subtle` | `#2e3650` | Separadores finos |
| `C.amber` | `#f59e0b` | Destaque primário, nav ativo |
| `C.amberDim` | `#f59e0b22` | Fundo do item de nav ativo |
| `C.green` | `#22d3a0` | Sucesso, status OK |
| `C.greenDim` | `#22d3a015` | Fundo de badge de sucesso |
| `C.red` | `#f4485e` | Erro, perigo |
| `C.redDim` | `#f4485e15` | Fundo de badge/botão de perigo |
| `C.blue` | `#4f8ef7` | Ação primária (botão Conectar, links) |
| `C.blueDim` | `#4f8ef715` | Fundo informativo |
| `C.purple` | `#a78bfa` | Status "Em Venda" |
| `C.purpleDim` | `#a78bfa15` | Fundo de badge purple |
| `C.cyan` | `#22d4dd` | Indicadores secundários |
| `C.orange` | `#fb923c` | Alertas não críticos |

Cores de **dim** (fundo semitransparente de badge) são sempre `cor + "15"` ou `cor + "22"` em hex.  
Nunca usar `rgba()` — usar a notação `#rrggbbaa`.

---

### Tipografia

- Família: `'Syne', 'Segoe UI', sans-serif` (sempre nessa ordem).  
  Aplicar como `fontFamily: "'Syne', sans-serif"` em botões e inputs.
- Tamanhos canônicos:

| Uso | `fontSize` | `fontWeight` |
|---|---|---|
| Título de página (`<h2>`) | `22` | `800` |
| Label de seção (caps) | `12` | `700` |
| Texto de card / corpo | `13` | `400` |
| Subtítulo / status | `11` | `400` |
| Badge / meta | `10` | `700` |
| Rótulo de tab (nav) | `13` | `400 / 700 ativo` |

- `letterSpacing: '0.08em'` em labels de seção com `textTransform: 'uppercase'`.

---

### Espaçamento

| Contexto | Valor |
|---|---|
| Padding interno de page | `24px 20px` |
| Gap entre cards em grid | `10px` |
| Padding interno de card | `14px 16px` |
| Padding interno de modal | `28px` |
| `marginBottom` de seção | `28px` |
| `marginBottom` de label de seção | `10px` |
| Gap entre itens de linha (`row`) | `10px` |

---

### Componentes canônicos

Copie diretamente. Não reescreva do zero nem misture com outro padrão.

#### Objeto de estilos compartilhado `s`

```js
const s = {
  page:       { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
  titulo:     { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 20px' },
  secao:      { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', margin: '0 0 10px' },
  grid:       { display: 'grid', gap: 10, marginBottom: 28 },
  card:       { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '14px 16px' },
  row:        { display: 'flex', alignItems: 'center', gap: 10 },
  badge:      { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  btn:        { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                fontWeight: 700, padding: '7px 14px', fontFamily: "'Syne', sans-serif" },
  btnPrimary: { background: C.blue,   color: '#fff' },
  btnGhost:   { background: C.card,   color: C.muted, border: `1px solid ${C.border}` },
  btnDanger:  { background: C.redDim, color: C.red },
  input:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, padding: '8px 12px', width: '100%',
                fontFamily: "'Syne', sans-serif" },
  overlay:    { position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                padding: 28, width: 420, maxWidth: '94vw' },
  erro:       { background: C.redDim, color: C.red, borderRadius: 8,
                padding: '10px 14px', fontSize: 12, marginBottom: 12 },
}
```

#### Card básico

```jsx
<div style={s.card}>
  <div style={s.row}>
    <span style={{ fontSize: 22 }}>{emoji}</span>
    <div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{titulo}</p>
      <span style={{ fontSize: 11, color: C.muted }}>{subtitulo}</span>
    </div>
  </div>
</div>
```

#### Badge de status

```jsx
// cor = C.green | C.amber | C.red | C.purple | C.blue | C.faint
<span style={{ ...s.badge, background: `${cor}22`, color: cor }}>{label}</span>
```

#### Botões

```jsx
<button style={{ ...s.btn, ...s.btnPrimary }}>Ação</button>   // azul — ação principal
<button style={{ ...s.btn, ...s.btnGhost  }}>Cancelar</button> // cinza — secundário
<button style={{ ...s.btn, ...s.btnDanger }}>Remover</button>  // vermelho — destrutivo
```

Variação compacta (dentro de cards de lista): `padding: '3px 8px', fontSize: 10`.

#### Input / Select

```jsx
<input style={s.input} />
<select style={s.input}><option>...</option></select>
<textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} />
```

#### Modal

```jsx
<div style={s.overlay}>
  <div style={s.modal}>
    <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>
      Título do Modal
    </h3>
    {/* conteúdo */}
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
      <button style={{ ...s.btn, ...s.btnGhost   }} onClick={onFechar}>Cancelar</button>
      <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onSalvar}>Salvar</button>
    </div>
  </div>
</div>
```

#### Estrutura de página

```jsx
<div style={s.page}>
  <h2 style={s.titulo}>Nome da Página</h2>

  {erro && <div style={s.erro}>{erro}</div>}

  <p style={s.secao}>Nome da Seção</p>
  <div style={{ ...s.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
    {/* cards */}
  </div>
</div>
```

---

### Responsividade

Usar o hook `useBreakpoint()` de `src/lib/responsive.js`:

```js
const { isMobile, isTablet, isDesktop, cols, val } = useBreakpoint()

// Exemplo: colunas de grid adaptativas
gridTemplateColumns: cols('1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)')

// Exemplo: padding adaptativo
padding: val('16px 12px', '20px 16px', '24px 20px')
```

Breakpoints (objeto `BP`):

| Nome | Largura | Dispositivo |
|---|---|---|
| `sm` | < 480px | Smartphone portrait |
| `md` | 480–768px | Smartphone landscape / tablet portrait |
| `lg` | 768–1024px | Tablet landscape / desktop pequeno |
| `xl` | ≥ 1280px | Desktop |

`isMobile = width < 768` · `isTablet = 768–1024` · `isDesktop = ≥ 1024`

Regras fixas:
- `maxWidth` de page: `1100px` (páginas internas) ou `1400px` (layout raiz em `App.jsx`).
- Bottom nav mobile tem `paddingBottom: 'env(safe-area-inset-bottom)'` para safe area iOS.
- `padding` do `<main>` no mobile: `'16px 12px 80px'` (reserva espaço para bottom nav).

---

### Diretrizes para pedidos de alteração de layout

Ao pedir uma mudança visual ao Claude, especifique:

1. **O que muda** — componente, página ou padrão afetado (ex.: "o card de veículo", "a barra de nav").
2. **O resultado esperado** — descreva a aparência final, não o mecanismo (ex.: "quero que o status apareça como uma pílula colorida no canto superior direito do card").
3. **Escopo** — se a mudança é só naquela página ou em todos os lugares onde o componente aparece.
4. **Restrições** — se deve continuar responsivo, se não pode quebrar o layout mobile, etc.

Claude deve:
- Usar **sempre** tokens do objeto `C` — nunca cores literais soltas como `'#fff'` ou `'gray'`.
- Reaproveitar o objeto `s` local da página antes de criar novos estilos.
- Não criar arquivos CSS, Tailwind classes, styled-components ou qualquer abstração de estilo fora do padrão inline.
- Manter o padrão de objeto `s` declarado no topo do arquivo, fora dos componentes.
- Ao criar um novo componente visual, documentar seu contrato de props em um comentário de uma linha acima da função.
