/**
 * Client Supabase com service_role — bypassa RLS. Server-only, nunca importar
 * no bundle do browser. Compartilhado por qualquer função em api/*.js que
 * precise ler/escrever direto (webhooks não-autenticados por Bearer token,
 * como api/whatsapp-webhook.js, não passam pelo guard() de api/_guard.js).
 */
import { createClient } from '@supabase/supabase-js'

export const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
