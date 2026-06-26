import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';

const supabaseUrl = privateEnv.SUPABASE_URL;
const supabaseAnonKey = privateEnv.SUPABASE_ANON_KEY;
export const storageBucket = privateEnv.SUPABASE_STORAGE_BUCKET || 'Imagenes';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseServerClient = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export function requireSupabase() {
  if (!supabaseServerClient) throw new Error('Supabase no esta configurado');
  return supabaseServerClient;
}
