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

  try {
    const url = new URL(value);
    const host = url.host.toLowerCase();

    if (host.includes('maps.app.goo.gl') || host.includes('goo.gl/maps')) return value;
    if (host.endsWith('google.com') || host.endsWith('google.com.ve') || host.includes('maps.google')) {
      return value;
    }
    if (host.includes('google') && url.pathname.startsWith('/maps')) return value;

    return value;
  } catch {
    return null;
  }
}

export function validateCenterForm(form: CenterForm): string[] {
  const errors: string[] = [];

  if (!form.nombre.trim()) errors.push('el nombre del centro');
  if (!form.estado) errors.push('el estado');
  if (!form.direccion.trim()) errors.push('la direccion');
  if (!normalizeMapsUrl(form.mapsUrl)) errors.push('el enlace de Google Maps');
  if (!form.responsable.trim()) errors.push('el nombre del responsable');
  if (!form.cedula.trim()) errors.push('la cedula o identificacion');
  if (!form.correo.trim()) errors.push('el correo electronico');
  if (!form.descripcion.trim()) errors.push('la descripcion');
  if (!form.urgencia) errors.push('el nivel de urgencia');

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
    imageUrl: record.image_url || record.image_data || null
  };
}

export function toRecord(
  form: CenterForm,
  id: string,
  creatorId: string,
  creatorIp: string | null,
  imageUrl: string | null,
  publishedAt?: string
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
    tipos: form.tipos,
    urgencia: (form.urgencia || 'baja') as Urgency,
    fecha_publicacion: publishedAt || new Date().toISOString(),
    creator_id: creatorId,
    creator_ip: creatorIp,
    image_url: imageUrl,
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
    id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }

  return id;
}

export function isOwned(center: Center, userId: string, userIp: string | null): boolean {
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
