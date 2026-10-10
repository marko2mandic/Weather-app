import { createClient } from '@supabase/supabase-js'

// Project URL and publishable key are public by design (they ship in every browser bundle);
// all data access is enforced by Row Level Security, see supabase/migrations.
const SUPABASE_URL = 'https://xijvnexkbgtcbbdvhtlj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_yQreZ_GhfEA9dzVG-aqsIg_q4phMS8c'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
