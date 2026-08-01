import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True khi file .env da duoc dien day du - dung de hien man hinh huong dan. */
export const isSupabaseConfigured =
  Boolean(url) && Boolean(anonKey) && !url.includes('xxxxxxxx')

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'moneysaver.auth',
  },
  realtime: { params: { eventsPerSecond: 5 } },
})
