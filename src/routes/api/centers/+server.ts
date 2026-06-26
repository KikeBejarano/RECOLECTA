import { json, type RequestHandler } from '@sveltejs/kit';
import { requireSupabase, storageBucket, supabaseConfigured } from '$lib/server/supabase';
import { fromRecord, toRecord, validateCenterForm, type CenterForm, type CenterRecord } from '$lib/centers';
import { resolveGoogleMapsUrl } from '$lib/server/mapResolver';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

class ClientInputError extends Error {}

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  if (!supabaseConfigured) {
    return json({ centers: [], error: 'Supabase no esta configurado.' }, { status: 503 });
  }

  try {
    const supabase = requireSupabase();
    const actorId = normalizeActorId(url.searchParams.get('creatorId') || '');
    const clientIp = getClientAddress();
    const { data, error } = await supabase
      .from('centros')
      .select('*')
      .order('fecha_publicacion', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Supabase load error', error);
      return json({ error: 'No se pudieron cargar los centros.' }, { status: 500 });
    }

    const centers = ((data || []) as CenterRecord[]).map((center) => publicCenterRecord(center, actorId, clientIp));
    return json({ centers });
  } catch (error) {
    console.error('Supabase load exception', error);
    return json({ error: 'No se pudieron cargar los centros.' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  if (!supabaseConfigured) {
    return json({ error: 'Supabase no esta configurado.' }, { status: 503 });
  }

  try {
    const supabase = requireSupabase();
    const body = await request.formData();
    const action = String(body.get('action') || 'create');
    const actorId = normalizeActorId(String(body.get('creatorId') || ''));
    const clientIp = getClientAddress();

    if (!['create', 'update', 'delete'].includes(action)) {
      return json({ error: 'Accion invalida.' }, { status: 400 });
    }

    if (action === 'delete') {
      const id = String(body.get('id') || '');
      if (!VALID_ID_PATTERN.test(id)) return json({ error: 'Id de centro invalido.' }, { status: 400 });

      const existing = await getExistingCenter(id);
      if (!canMutate(existing, actorId, clientIp)) {
        return json({ error: 'No tienes permiso para modificar este centro.' }, { status: 403 });
      }

      const { error } = await supabase.from('centros').delete().eq('id', id);
      if (error) throw error;

      return json({ ok: true });
    }

    const form = parseCenterForm(body);
    const errors = validateCenterForm(form);
    if (errors.length) return json({ error: `Por favor completa: ${errors.join(', ')}.` }, { status: 400 });

    const isUpdate = action === 'update';
    const id = String(body.get('id') || `c_${Date.now()}`);
    if (!VALID_ID_PATTERN.test(id)) return json({ error: 'Id de centro invalido.' }, { status: 400 });

    const existing = isUpdate ? await getExistingCenter(id) : null;

    if (isUpdate && !canMutate(existing, actorId, clientIp)) {
      return json({ error: 'No tienes permiso para modificar este centro.' }, { status: 403 });
    }

    const file = body.get('image');
    let imageUrl = existing?.image_url || null;
    let uploadedPath: string | null = null;
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadCenterImage(file);
      imageUrl = uploaded.publicUrl;
      uploadedPath = uploaded.path;
    }
    const location = await resolveLocationOnSubmit(form.mapsUrl);

    const record = toRecord(
      form,
      id,
      actorId,
      clientIp,
      imageUrl,
      existing?.fecha_publicacion || undefined,
      location
    );

    const { data, error } = await mutateCenter(record, id, isUpdate);
    if (error && isMissingCoordinateColumn(error)) {
      const compatibleRecord = { ...record };
      delete compatibleRecord.lat;
      delete compatibleRecord.lng;
      const retry = await mutateCenter(compatibleRecord, id, isUpdate);
      if (retry.error) {
        if (uploadedPath) await removeUploadedImage(uploadedPath);
        throw retry.error;
      }

      const saved = ((retry.data && retry.data[0]) || compatibleRecord) as CenterRecord;
      const publicRecord = publicCenterRecord(saved, actorId, clientIp);
      return json({ center: publicRecord, view: fromRecord(publicRecord), coordinatesPersisted: false });
    }

    if (error) {
      if (uploadedPath) await removeUploadedImage(uploadedPath);
      throw error;
    }

    const saved = ((data && data[0]) || record) as CenterRecord;
    const publicRecord = publicCenterRecord(saved, actorId, clientIp);
    return json({ center: publicRecord, view: fromRecord(publicRecord), coordinatesPersisted: true });
  } catch (error) {
    if (error instanceof ClientInputError) {
      return json({ error: error.message }, { status: 400 });
    }

    console.error('Supabase center mutation error', error);
    return json({ error: 'No se pudo guardar el centro.' }, { status: 500 });
  }
};

async function getExistingCenter(id: string): Promise<CenterRecord | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('centros').select('*').eq('id', id).single();

  if (error) return null;
  return data as CenterRecord;
}

async function mutateCenter(record: CenterRecord, id: string, isUpdate: boolean) {
  const supabase = requireSupabase();
  return isUpdate
    ? supabase.from('centros').update(record).eq('id', id).select()
    : supabase.from('centros').insert([record]).select();
}

function isMissingCoordinateColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message || error);
  return message.includes("'lat'") || message.includes("'lng'") || message.includes('lat') || message.includes('lng');
}

async function resolveLocationOnSubmit(mapsUrl: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const resolved = await resolveGoogleMapsUrl(mapsUrl);
    return resolved.location;
  } catch (error) {
    console.error('Map URL submit resolution failed', error);
    return null;
  }
}

function canMutate(center: CenterRecord | null, actorId: string, clientIp: string | null): boolean {
  if (!center) return false;
  if (actorId && center.creator_id && actorId === center.creator_id) return true;
  if (clientIp && center.creator_ip && clientIp === center.creator_ip) return true;
  return false;
}

function publicCenterRecord(center: CenterRecord, actorId: string, clientIp: string | null): CenterRecord {
  return {
    ...center,
    creator_id: null,
    creator_ip: null,
    can_edit: canMutate(center, actorId, clientIp)
  };
}

function normalizeActorId(value: string): string {
  return value.length <= 120 ? value : '';
}

function parseCenterForm(body: FormData): CenterForm {
  return {
    nombre: String(body.get('nombre') || ''),
    estado: String(body.get('estado') || ''),
    direccion: String(body.get('direccion') || ''),
    mapsUrl: String(body.get('mapsUrl') || ''),
    responsable: String(body.get('responsable') || ''),
    cedula: String(body.get('cedula') || ''),
    correo: String(body.get('correo') || ''),
    telefono: String(body.get('telefono') || ''),
    horario: String(body.get('horario') || ''),
    descripcion: String(body.get('descripcion') || ''),
    tipos: body.getAll('tipos').map(String),
    urgencia: String(body.get('urgencia') || '') as CenterForm['urgencia']
  };
}

async function uploadCenterImage(file: File): Promise<{ path: string; publicUrl: string | null }> {
  if (file.size > MAX_IMAGE_BYTES) throw new ClientInputError('La imagen supera 5MB.');
  if (!file.type.startsWith('image/')) throw new ClientInputError('El archivo debe ser una imagen.');

  const supabase = requireSupabase();
  const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '') || 'imagen';
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
  const path = `centros/${id}_${safeName}`;
  const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined
  });

  if (error) throw error;

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl || null };
}

async function removeUploadedImage(path: string) {
  try {
    const supabase = requireSupabase();
    const { error } = await supabase.storage.from(storageBucket).remove([path]);
    if (error) console.error('Uploaded image cleanup failed', error);
  } catch (error) {
    console.error('Uploaded image cleanup exception', error);
  }
}
