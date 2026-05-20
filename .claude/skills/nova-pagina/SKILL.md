---
name: nova-pagina
description: Cria scaffold de nova página/aba no Dashboard CLV seguindo o padrão do CLAUDE.md
---

Crie uma nova página chamada {args} seguindo exatamente os 3 passos abaixo:

1. Crie `src/pages/{args}.jsx` com a estrutura canônica:
   - Objeto `s` declarado fora do componente usando tokens `C` de `src/lib/constants.js`
   - Hook `useBreakpoint()` de `src/lib/responsive.js` para responsividade
   - Estrutura de página padrão: `<div style={s.page}>`, `<h2 style={s.titulo}>`, seções com `<p style={s.secao}>`
   - Props documentadas em comentário de uma linha acima da função
   - Sem CSS externo, Tailwind ou styled-components — apenas inline styles

2. Em `src/App.jsx`, importe o componente e adicione uma entrada em `TABS_BASE`:
   ```js
   { id: '{id_da_aba}', label: '{Label Visível}', icon: '{emoji}', component: {args} }
   ```

3. Em `src/App.jsx`, adicione o case de renderização no bloco `{abaAtual === ...}` dentro do `<main>`.

Confirme os 3 passos após concluir mostrando os trechos de código alterados.
