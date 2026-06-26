import { json, type RequestHandler } from '@sveltejs/kit';
import { requireSupabase, storageBucket } from '$lib/server/supabase';
import { fromRecord, toRecord, validateCenterForm, type CenterForm, type CenterRecord } from '$lib/centers';
import { isGoogleMapsUrl, latLngFromMapsUrl } from '$lib/mapLinks';

export const GET: RequestHandler = async () => {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('centros')
    .select('*')
    .order('fecha_publicacion', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Supabase load error', error);
    return json({ error: 'No se pudieron cargar los centros.' }, { status: 500 });
  }

  return json({ centers: (data || []) as CenterRecord[] });
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const supabase = requireSupabase();
  const body = await request.formData();
  const action = String(body.get('action') || 'create');
  const actorId = String(body.get('creatorId') || '');
  const clientIp = getClientAddress();

  try {
    if (action === 'delete') {
      const id = String(body.get('id') || '');
      if (!id) return json({ error: 'Falta el id del centro.' }, { status: 400 });

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
    const existing = isUpdate ? await getExistingCenter(id) : null;

    if (isUpdate && !canMutate(existing, actorId, clientIp)) {
      return json({ error: 'No tienes permiso para modificar este centro.' }, { status: 403 });
    }

    const file = body.get('image');
    let imageUrl = existing?.image_url || null;
    if (file instanceof File && file.size > 0) {
      imageUrl = await uploadCenterImage(file);
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
      if (retry.error) throw retry.error;

      const saved = ((retry.data && retry.data[0]) || compatibleRecord) as CenterRecord;
      return json({ center: saved, view: fromRecord(saved), coordinatesPersisted: false });
    }

    if (error) throw error;

    const saved = ((data && data[0]) || record) as CenterRecord;
    return json({ center: saved, view: fromRecord(saved), coordinatesPersisted: true });
  } catch (error) {
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
  const directLocation = latLngFromMapsUrl(mapsUrl);
  if (directLocation) return directLocation;
  if (!isGoogleMapsUrl(mapsUrl)) return null;

  try {
    const response = await fetch(mapsUrl, {
      method: 'GET',
      redirect: 'follow'
    });
    return latLngFromMapsUrl(response.url || mapsUrl);
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

async function uploadCenterImage(file: File): Promise<string | null> {
  const supabase = requireSupabase();
  const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const path = `centros/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined
  });

  if (error) throw error;

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return data.publicUrl || null;
}
