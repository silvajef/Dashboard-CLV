import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase env vars missing. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'clv-auth-v2',  // mudou de 'clv-auth' para 'clv-auth-v2'
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})