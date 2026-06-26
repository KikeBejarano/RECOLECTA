import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import type { CenterRecord } from './centers';

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;
const storageBucket = env.PUBLIC_SUPABASE_STORAGE_BUCKET || 'Imagenes';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseClient = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export async function loadCenters(): Promise<CenterRecord[]> {
  if (!supabaseClient) return [];

  const { data, error } = await supabaseClient
    .from('centros')
    .select('*')
    .order('fecha_publicacion', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data || []) as CenterRecord[];
}

export async function createCenter(record: CenterRecord): Promise<CenterRecord | null> {
  if (!supabaseClient) throw new Error('Supabase no esta configurado');

  const { data, error } = await supabaseClient.from('centros').insert([record]).select();
  if (error) throw error;
  return (data?.[0] as CenterRecord) || null;
}

export async function updateCenter(id: string, record: CenterRecord): Promise<CenterRecord | null> {
  if (!supabaseClient) throw new Error('Supabase no esta configurado');

  const { data, error } = await supabaseClient.from('centros').update(record).eq('id', id).select();
  if (error) throw error;
  return (data?.[0] as CenterRecord) || null;
}

export async function deleteCenter(id: string): Promise<void> {
  if (!supabaseClient) throw new Error('Supabase no esta configurado');

  const { error } = await supabaseClient.from('centros').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadCenterImage(file: File): Promise<string | null> {
  if (!supabaseClient) throw new Error('Supabase no esta configurado');

  const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const path = `centros/${Date.now()}_${safeName}`;
  const { error } = await supabaseClient.storage
    .from(storageBucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(storageBucket).getPublicUrl(path);
  return data.publicUrl || null;
}
