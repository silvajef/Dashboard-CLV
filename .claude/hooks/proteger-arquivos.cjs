#!/usr/bin/env node
/**
 * Hook PreToolUse (Edit|Write): bloqueia escrita em arquivos que não devem ser
 * tocados pelo Claude. Exit 2 = bloqueia e devolve a mensagem ao modelo.
 *
 * Substitui dois hooks inline em PowerShell que, testados em 28/10/2026, não
 * bloqueavam nada: no cmd o -match nunca casava e no Git Bash o comando dava
 * erro de parsing (exit 1, que o Claude Code trata como não bloqueante).
 * Ex.: echo '{"tool_name":"Write","tool_input":{"file_path":"x.sql"}}' | node .claude/hooks/proteger-arquivos.cjs
 */
const path = require('path')

// Arquivos temporários (scratchpad da sessão) podem ser .sql de rascunho.
const PASTA_TEMPORARIA = /[\\/](Temp|tmp|scratchpad)[\\/]/i

const REGRAS = [
  {
    casa: (arq, ferramenta) => /(^|[\\/])\.env(\.[\w.-]+)?$/i.test(arq) && !/\.env\.example$/i.test(arq),
    motivo: arq => `Edições diretas em ${arq} são proibidas. Edite manualmente se necessário.`,
  },
  {
    casa: (arq, ferramenta) => /\.sql$/i.test(arq) && !PASTA_TEMPORARIA.test(arq),
    motivo: arq => `Não crie nem edite arquivo .sql (${arq}). Mudanças de banco vão direto no ` +
      'Supabase via apply_migration — use /nova-migracao (ver "Banco de dados" no CLAUDE.md).',
  },
]

function lerEntrada() {
  try {
    return JSON.parse(require('fs').readFileSync(0, 'utf8') || '{}')
  } catch {
    return {}
  }
}

const entrada = lerEntrada()
const arquivo = path.normalize(String(entrada.tool_input?.file_path || ''))
const regra = arquivo && REGRAS.find(r => r.casa(arquivo, entrada.tool_name))
if (regra) {
  process.stderr.write(`BLOQUEADO: ${regra.motivo(arquivo)}\n`)
  process.exit(2)
}
process.exit(0)
