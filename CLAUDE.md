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
