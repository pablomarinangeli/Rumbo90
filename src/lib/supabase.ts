import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && anonKey)

// Sin configuración se crea un cliente inválido; la app muestra la pantalla de configuración.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'sin-configurar', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
