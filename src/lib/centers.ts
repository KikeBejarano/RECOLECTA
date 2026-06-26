import { isGoogleMapsUrl } from './mapLinks';

export type Urgency = 'alta' | 'media' | 'baja';
export type Tab = 'ver' | 'publicar';

export type CenterRecord = {
  id: string;
  nombre: string;
  estado: string;
  direccion: string;
  maps_url: string | null;
  responsable: string;
  cedula: string;
  correo: string;
  telefono: string;
  horario: string;
  descripcion: string;
  tipos: string[];
  urgencia: Urgency;
  fecha_publicacion: string;
  creator_id: string | null;
  creator_ip: string | null;
  image_url: string | null;
  lat?: number | null;
  lng?: number | null;
  can_edit?: boolean;
  image_data?: string | null;
  extra?: Record<string, unknown>;
};

export type Center = {
  id: string;
  nombre: string;
  estado: string;
  direccion: string;
  mapsUrl: string | null;
  responsable: string;
  cedula: string;
  correo: string;
  telefono: string;
  horario: string;
  descripcion: string;
  tipos: string[];
  urgencia: Urgency;
  fechaPublicacion: string;
  fecha_publicacion?: string;
  creatorId: string | null;
  creatorIp: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  canEdit: boolean;
};

export type CenterForm = {
  nombre: string;
  estado: string;
  direccion: string;
  mapsUrl: string;
  responsable: string;
  cedula: string;
  correo: string;
  telefono: string;
  horario: string;
  descripcion: string;
  tipos: string[];
  urgencia: Urgency | '';
};

export const emptyForm: CenterForm = {
  nombre: '',
  estado: '',
  direccion: '',
  mapsUrl: '',
  responsable: '',
  cedula: '',
  correo: '',
  telefono: '',
  horario: '',
  descripcion: '',
  tipos: [],
  urgencia: ''
};

export const venezuelaStates = [
  'Amazonas',
  'Anzoategui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolivar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Caracas (Distrito Capital)',
  'Falcon',
  'Guarico',
  'Lara',
  'La Guaira (Vargas)',
  'Merida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Tachira',
  'Trujillo',
  'Yaracuy',
  'Zulia'
];

export const donationTypes = [
  'Alimentos',
  'Agua',
  'Medicinas',
  'Ropa',
  'Higiene',
  'Pañales',
  'Herramientas',
  'Voluntarios',
  'Dinero',
  'Otro'
];

export const badgeClass: Record<string, string> = {
  Alimentos: 'food',
  Agua: 'water',
  Medicinas: 'medical',
  Ropa: 'clothes',
  Higiene: 'clothes',
  Pañales: 'clothes',
  Herramientas: 'tools',
  Voluntarios: 'tools',
  Dinero: 'money',
  Otro: 'tools'
};

export const urgencyLabel: Record<Urgency, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Normal'
};

export const urgencyTone: Record<Urgency, string> = {
  alta: 'high',
  media: 'medium',
  baja: 'normal'
};

export function normalizeMapsUrl(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;

  return isGoogleMapsUrl(value) ? value : null;
}

export function validateCenterForm(form: CenterForm): string[] {
  const errors: string[] = [];

  if (!form.nombre.trim() || form.nombre.trim().length > 100) errors.push('el nombre del centro');
  if (!venezuelaStates.includes(form.estado)) errors.push('el estado');
  if (!form.direccion.trim() || form.direccion.trim().length > 240) errors.push('la direccion');
  if (!normalizeMapsUrl(form.mapsUrl)) errors.push('el enlace de Google Maps');
  if (!form.responsable.trim() || form.responsable.trim().length > 100) errors.push('el nombre del responsable');
  if (!form.cedula.trim() || form.cedula.trim().length > 40) errors.push('la cedula o identificacion');
  if (!isValidEmail(form.correo)) errors.push('el correo electronico');
  if (form.telefono.trim().length > 40) errors.push('el telefono');
  if (form.horario.trim().length > 120) errors.push('el horario');
  if (!form.descripcion.trim() || form.descripcion.trim().length > 1000) errors.push('la descripcion');
  if (!form.urgencia || !Object.keys(urgencyLabel).includes(form.urgencia)) errors.push('el nivel de urgencia');
  if (form.tipos.length > donationTypes.length) errors.push('los tipos de donacion');

  return errors;
}

export function fromRecord(record: CenterRecord): Center {
  const published = record.fecha_publicacion || new Date().toISOString();

  return {
    id: record.id,
    nombre: record.nombre || '',
    estado: record.estado || '',
    direccion: record.direccion || '',
    mapsUrl: record.maps_url || null,
    responsable: record.responsable || '',
    cedula: record.cedula || '',
    correo: record.correo || '',
    telefono: record.telefono || '',
    horario: record.horario || '',
    descripcion: record.descripcion || '',
    tipos: Array.isArray(record.tipos) ? record.tipos : [],
    urgencia: record.urgencia || 'baja',
    fechaPublicacion: new Date(published).toLocaleDateString('es-VE'),
    fecha_publicacion: published,
    creatorId: record.creator_id || null,
    creatorIp: record.creator_ip || null,
    imageUrl: record.image_url || record.image_data || null,
    lat: typeof record.lat === 'number' ? record.lat : null,
    lng: typeof record.lng === 'number' ? record.lng : null,
    canEdit: Boolean(record.can_edit)
  };
}

export function toRecord(
  form: CenterForm,
  id: string,
  creatorId: string,
  creatorIp: string | null,
  imageUrl: string | null,
  publishedAt?: string,
  location?: { lat: number; lng: number } | null
): CenterRecord {
  return {
    id,
    nombre: form.nombre.trim(),
    estado: form.estado,
    direccion: form.direccion.trim(),
    maps_url: normalizeMapsUrl(form.mapsUrl),
    responsable: form.responsable.trim(),
    cedula: form.cedula.trim(),
    correo: form.correo.trim(),
    telefono: form.telefono.trim(),
    horario: form.horario.trim(),
    descripcion: form.descripcion.trim(),
    tipos: sanitizedDonationTypes(form.tipos),
    urgencia: (form.urgencia || 'baja') as Urgency,
    fecha_publicacion: publishedAt || new Date().toISOString(),
    creator_id: creatorId || null,
    creator_ip: creatorIp,
    image_url: imageUrl,
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    image_data: null,
    extra: {}
  };
}

export function formFromCenter(center: Center): CenterForm {
  return {
    nombre: center.nombre,
    estado: center.estado,
    direccion: center.direccion,
    mapsUrl: center.mapsUrl || '',
    responsable: center.responsable,
    cedula: center.cedula,
    correo: center.correo,
    telefono: center.telefono,
    horario: center.horario,
    descripcion: center.descripcion,
    tipos: [...center.tipos],
    urgencia: center.urgencia
  };
}

export function getUserId(): string {
  const key = 'centros_acopio_ve_user_id';
  let id = localStorage.getItem(key);

  if (!id) {
    id = globalThis.crypto?.randomUUID
      ? `u_${globalThis.crypto.randomUUID()}`
      : `u_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(key, id);
  }

  return id;
}

export function isOwned(center: Center, userId: string, userIp: string | null): boolean {
  if (center.canEdit) return true;
  if (center.creatorId && center.creatorId === userId) return true;
  if (center.creatorIp && userIp && center.creatorIp === userIp) return true;
  return false;
}

export function whatsappUrl(center: Center): string | null {
  const phone = center.telefono.replace(/\D/g, '');
  if (!phone) return null;

  const message = `Hola, vi tu centro "${center.nombre}" en RECOLECTA y quiero ayudar.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function shareText(center: Center): string {
  return [
    `🤝 ${center.nombre}`,
    `📍 ${center.estado} · ${center.direccion}`,
    center.telefono ? `📞 ${center.telefono}` : '📞 ',
    center.mapsUrl || '',
    '',
    'Comparte para que más personas puedan ayudar 🇻🇪'
  ]
    .join('\n');
}

function sanitizedDonationTypes(values: string[]): string[] {
  return [...new Set(values.filter((type) => donationTypes.includes(type)))];
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 3 && trimmed.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
