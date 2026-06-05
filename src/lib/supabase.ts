import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xzbedwiwrztvjnhkvbhl.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ocGmiAw__RR5mmSyhNgpcg_UwC9CLxF'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
