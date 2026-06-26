// ─── STORAGE ────────────────────────────────────────────────
// ─── ESTADO ─────────────────────────────────────────────────
let centros = [];
let filtroEstado = 'todos';
let expandidoId = null;
let urgenciaSeleccionada = null;
let imagenSeleccionadaData = null;
let editCentroId = null;
const USER_ID_KEY = 'centros_acopio_ve_user_id';
const USER_IP_KEY = 'centros_acopio_ve_user_ip';
let userId = getUserId();
let userIp = localStorage.getItem(USER_IP_KEY) || null;
if (!userIp) {
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(data => {
      if (data && data.ip) {
        userIp = data.ip;
        localStorage.setItem(USER_IP_KEY, userIp);
      }
    }).catch(() => {});
}

// ─── BADGE HELPERS ───────────────────────────────────────────
const badgeClass = {
  'Alimentos':'food','Agua':'water','Medicinas':'medical',
  'Ropa':'clothes','Higiene':'clothes','Pañales':'clothes',
  'Herramientas':'tools','Voluntarios':'tools','Dinero':'food','Otro':'tools'
};

function badgeHTML(tipo) {
  return `<span class="badge ${badgeClass[tipo]||'tools'}">${tipo}</span>`;
}

function normalizeMapsUrl(rawUrl) {
  if (!rawUrl) return null;
  const value = rawUrl.trim();
  try {
    const url = new URL(value);
    const host = url.host.toLowerCase();
    if (host.includes('maps.app.goo.gl') || host.includes('goo.gl/maps')) {
      return value;
    }
    if (host.endsWith('google.com') || host.endsWith('google.com.ve') || host.includes('maps.google')) {
      return value;
    }
    if (host.includes('google') && url.pathname.startsWith('/maps')) {
      return value;
    }
    return value;
  } catch (e) {
    return null;
  }
}

function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function isOwned(centro) {
  if (!centro) return false;
  if (centro.creatorId && centro.creatorId === userId) return true;
  // Fallback: if the centro has a stored creatorIp and it matches current user's IP, allow edit
  if (centro.creatorIp && userIp && centro.creatorIp === userIp) return true;
  return false;
}

function resetForm() {
  editCentroId = null;
  imagenSeleccionadaData = null;
  document.getElementById('f-nombre').value = '';
  document.getElementById('f-direccion').value = '';
  document.getElementById('f-maps').value = '';
  document.getElementById('f-responsable').value = '';
  document.getElementById('f-cedula').value = '';
  document.getElementById('f-correo').value = '';
  document.getElementById('f-telefono').value = '';
  document.getElementById('f-horario').value = '';
  document.getElementById('f-descripcion').value = '';
  document.getElementById('f-estado').value = '';
  document.getElementById('f-imagen').value = '';
  document.getElementById('image-preview').innerHTML = '';
  const editBanner = document.getElementById('edit-banner');
  if (editBanner) editBanner.style.display = 'none';
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) submitBtn.textContent = '📢 Publicar centro ahora';
  ['alta','media','baja'].forEach(n=>{ const btn = document.getElementById('urg-'+n); if(btn) btn.className='urg-btn'; });
  urgenciaSeleccionada = null;
}

function editarCentro(id) {
  const centro = centros.find(c => c.id === id);
  if (!centro || !isOwned(centro)) return;
  editCentroId = id;
  document.getElementById('f-nombre').value = centro.nombre;
  document.getElementById('f-estado').value = centro.estado;
  document.getElementById('f-direccion').value = centro.direccion;
  document.getElementById('f-maps').value = centro.mapsUrl || '';
  document.getElementById('f-responsable').value = centro.responsable;
  document.getElementById('f-cedula').value = centro.cedula || '';
  document.getElementById('f-correo').value = centro.correo || '';
  document.getElementById('f-telefono').value = centro.telefono;
  document.getElementById('f-horario').value = centro.horario;
  document.getElementById('f-descripcion').value = centro.descripcion;
  imagenSeleccionadaData = centro.imageData || centro.image_url || null;
  document.getElementById('image-preview').innerHTML = imagenSeleccionadaData ? `<img src="${imagenSeleccionadaData}" alt="Previsualización de imagen" />` : '';
  urgenciaSeleccionada = centro.urgencia || null;
  ['alta','media','baja'].forEach(n=>{
    const btn = document.getElementById('urg-'+n);
    if (!btn) return;
    btn.className = 'urg-btn';
    if (n === urgenciaSeleccionada) btn.classList.add('sel-'+n);
  });
  const editBanner = document.getElementById('edit-banner');
  if (editBanner) editBanner.style.display = 'flex';
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) submitBtn.textContent = '💾 Guardar cambios';
  showTab('publicar');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarCentro(id) {
  const centro = centros.find(c => c.id === id);
  if (!centro || !isOwned(centro)) return;
  if (!confirm('¿Eliminar este centro de acopio?')) return;
  if (supabaseClient) {
    try {
      await deleteCentroFromDb(id);
    } catch (err) {
      console.error('Error deleting centro from DB', err);
      return;
    }
  }
  centros = centros.filter(c => c.id !== id);
  renderLista();
}

function cancelEdit() {
  resetForm();
}

// --- Supabase initialization (replace placeholders with your project values) ---
// IMPORTANT: SUPABASE_URL must be the project base URL and NOT include any path like /rest/v1 or /dashboard
const SUPABASE_URL = 'https://rdctrywbuibpdaqrdfqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkY3RyeXdidWlicGRhcXJkZnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODA1MjYsImV4cCI6MjA5ODA1NjUyNn0.gvgc-_MQJ_k0ptoDDWH38k1T2pPez-ItnpHX6_vJE_M';
const supabaseClient = (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR'))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const STORAGE_BUCKET = 'Imagenes';

// Upload a File object to the configured Supabase Storage bucket and return the public URL (if bucket is public)
async function uploadImageToBucket(file) {
  if (!supabaseClient) throw new Error('Supabase client no inicializado');
  if (!file) return null;
  const filename = `centros/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  try {
    const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filename, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: urlData, error: urlErr } = await supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
    if (urlErr) throw urlErr;
    return urlData.publicURL || urlData.publicUrl || null;
  } catch (err) {
    console.error('Supabase upload/insert error', err);
    if (err && err.message) {
      const text = err.message.toLowerCase();
      if (text.includes('bucket')) {
        mostrarToast('Error: Bucket no encontrado. Crea el bucket "' + STORAGE_BUCKET + '" en Supabase Storage o actualiza STORAGE_BUCKET en script.js');
      } else if (text.includes('row-level security') || text.includes('policy')) {
        mostrarToast('Error: tu bucket o tu tabla tiene row-level security activada. Ajusta las políticas de Storage o usa un bucket público.');
      } else {
        mostrarToast('Error al subir la imagen (ver consola)');
      }
    } else {
      mostrarToast('Error al subir la imagen (ver consola)');
    }
    throw err;
  }
}

// Insert centro record into Supabase 'centros' table
async function createCentroInDb(centro) {
  if (!supabaseClient) throw new Error('Supabase client no inicializado');
  try {
    const { data, error } = await supabaseClient.from('centros').insert([centro]).select();
    if (error) throw error;
    return data && data[0];
  } catch (err) {
    console.error('Supabase insert error', err);
    if (err && err.message && err.message.toLowerCase().includes('row-level security')) {
      mostrarToast('Error: tu tabla "centros" tiene RLS habilitada y la inserción está bloqueada. Ajusta la política o usa un backend seguro.');
    } else {
      mostrarToast('Error al guardar en la base de datos (ver consola)');
    }
    throw err;
  }
}

async function updateCentroInDb(id, centro) {
  if (!supabaseClient) throw new Error('Supabase client no inicializado');
  try {
    const { data, error } = await supabaseClient.from('centros').update(centro).eq('id', id).select();
    if (error) throw error;
    return data && data[0];
  } catch (err) {
    console.error('Supabase update error', err);
    if (err && err.message && err.message.toLowerCase().includes('row-level security')) {
      mostrarToast('Error: actualización bloqueada por RLS en la tabla "centros". Ajusta la política.');
    } else {
      mostrarToast('Error al actualizar el centro (ver consola)');
    }
    throw err;
  }
}

async function deleteCentroFromDb(id) {
  if (!supabaseClient) throw new Error('Supabase client no inicializado');
  try {
    const { error } = await supabaseClient.from('centros').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase delete error', err);
    if (err && err.message && err.message.toLowerCase().includes('row-level security')) {
      mostrarToast('Error: eliminación bloqueada por RLS en la tabla "centros". Ajusta la política.');
    } else {
      mostrarToast('Error al eliminar el centro (ver consola)');
    }
    throw err;
  }
}

async function loadCentrosFromDb() {
  if (!supabaseClient) {
    mostrarToast('Supabase no está configurado. Revisa link/clave en script.js');
    return;
  }
  try {
    const { data, error } = await supabaseClient.from('centros').select('*').order('fecha_publicacion', { ascending: false }).limit(200);
    if (error) throw error;
    centros = Array.isArray(data) ? data.map(item => ({
      ...item,
      creatorId: item.creator_id || null,
      creatorIp: item.creator_ip || null,
      imageData: item.image_url || null,
      mapsUrl: item.maps_url || null
    })) : [];
  } catch (err) {
    console.error('Supabase load error', err);
    mostrarToast('Error cargando los centros desde Supabase. Revisa la consola.');
    centros = [];
  }
}

function updateImagePreview() {
  const preview = document.getElementById('image-preview');
  const file = document.getElementById('f-imagen').files[0];
  imagenSeleccionadaData = null;
  preview.innerHTML = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    imagenSeleccionadaData = reader.result;
    preview.innerHTML = `<img src="${reader.result}" alt="Previsualización de imagen" />`;
  };
  reader.readAsDataURL(file);
}

// ─── STATS ───────────────────────────────────────────────────
function actualizarStats() {
  document.getElementById('stat-total').textContent = centros.length;
  document.getElementById('stat-urgente').textContent = centros.filter(c=>c.urgencia==='alta').length;
  const estados = new Set(centros.map(c=>c.estado));
  document.getElementById('stat-estados').textContent = estados.size;
}

// ─── CHIPS DE ESTADO ─────────────────────────────────────────
function renderChips() {
  const estados = ['todos', ...new Set(centros.map(c=>c.estado))].slice(0,8);
  const container = document.getElementById('chips-container');
  container.innerHTML = estados.map(e =>
    `<div class="chip ${filtroEstado===e?'active':''}" onclick="setFiltro('${e}',this)">
      ${e==='todos'?'Todos':e}
    </div>`
  ).join('');
}

function setFiltro(estado, el) {
  filtroEstado = estado;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderLista();
}

// ─── RENDER LISTA ────────────────────────────────────────────
function renderLista() {
  const q = (document.getElementById('search-input').value||'').toLowerCase().trim();
  const lista = centros.filter(c => {
    const matchEstado = filtroEstado==='todos' || c.estado===filtroEstado;
    const matchQ = !q ||
      c.nombre.toLowerCase().includes(q) ||
      c.estado.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) ||
      (c.descripcion||'').toLowerCase().includes(q);
    return matchEstado && matchQ;
  });

  actualizarStats();
  renderChips();

  const el = document.getElementById('lista-centros');

  if (centros.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">🤝</div>
        <h3>Aún no hay centros registrados</h3>
        <p>Sé el primero en publicar un centro de acopio<br>para que otros sepan dónde llevar su ayuda.</p>
        <button onclick="showTab('publicar')">➕ Publicar el primer centro</button>
      </div>`;
    return;
  }

  if (lista.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <h3>No se encontraron centros</h3>
        <p>Intenta con otro término de búsqueda<br>o selecciona "Todos" en los filtros.</p>
      </div>`;
    return;
  }

  el.innerHTML = lista.map(c => {
    const esExpandido = expandidoId === c.id;
    const urgLabel = {alta:'🔴 Urgente',media:'🟡 Media urgencia',baja:'🟢 Normal'}[c.urgencia]||'';
    const urgClass = {alta:'urg-alta',media:'urg-media',baja:'urg-baja'}[c.urgencia]||'';
    const tipos3 = (c.tipos||[]).slice(0,4);
    const mastipos = (c.tipos||[]).length > 4 ? `+${c.tipos.length-4}` : '';
    const whatsapp = c.telefono ? `https://wa.me/${c.telefono.replace(/\D/g,'')}?text=Hola, vi tu centro "${c.nombre}" en la app de ayuda y quiero ayudar.` : null;

    return `
      <div class="centro-card ${esExpandido?'expandido':''}" id="card-${c.id}">
        ${c.imageData ? `<div class="card-image"><img src="${c.imageData}" alt="Imagen del centro ${c.nombre}"></div>` : ''}
        <div class="card-header" onclick="toggleCard('${c.id}')">
          <div class="card-tipo-icon general">🏠</div>
          <div class="card-body">
            <div class="card-name">${c.nombre}</div>
            <div class="card-ubicacion">📍 ${c.estado} · ${c.direccion.length>50?c.direccion.substring(0,50)+'…':c.direccion}</div>
            <span class="card-urgencia ${urgClass}">${urgLabel}</span>
            <div class="card-badges">
              ${tipos3.map(t=>badgeHTML(t)).join('')}
              ${mastipos?`<span class="badge tools">+${mastipos}</span>`:''}
            </div>
          </div>
          <span class="card-chevron">⌄</span>
        </div>

        <div class="card-detail ${esExpandido?'show':''}">
          ${c.descripcion ? `<div class="detail-row"><span class="di">📝</span><span>${c.descripcion}</span></div>` : ''}
          ${c.horario ? `<div class="detail-row"><span class="di">🕐</span><span>${c.horario}</span></div>` : ''}
          <div class="detail-row"><span class="di">👤</span><span>${c.responsable}</span></div>
          ${c.cedula ? `<div class="detail-row"><span class="di">🆔</span><span>${c.cedula}</span></div>` : ''}
          ${c.correo ? `<div class="detail-row"><span class="di">✉️</span><span>${c.correo}</span></div>` : ''}
          ${c.telefono ? `<div class="detail-row"><span class="di">📞</span><span>${c.telefono}</span></div>` : ''}

          ${(c.tipos||[]).length ? `
          <div class="detail-tipos">
            <div class="label">Reciben:</div>
            <div class="card-badges">${(c.tipos||[]).map(t=>badgeHTML(t)).join('')}</div>
          </div>` : ''}

          <div class="detail-actions">
            ${c.mapsUrl ? `<a class="btn-maps" href="${c.mapsUrl}" target="_blank" rel="noopener">📍 Ver en Google Maps</a>` : ''}
            ${whatsapp ? `<a class="btn-primary" href="${whatsapp}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
            <button class="btn-outline" onclick="compartirCentro('${c.id}')">🔗 Compartir</button>
            ${isOwned(c) ? `<button class="btn-outline" onclick="editarCentro('${c.id}')">✏️ Editar</button>` : ''}
            ${isOwned(c) ? `<button class="btn-outline btn-danger" onclick="borrarCentro('${c.id}')">🗑️ Borrar</button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleCard(id) {
  expandidoId = expandidoId === id ? null : id;
  renderLista();
  if (expandidoId) {
    setTimeout(()=>{
      const el = document.getElementById('card-'+id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 50);
  }
}

// ─── COMPARTIR ───────────────────────────────────────────────
function compartirCentro(id) {
  const c = centros.find(x=>x.id===id);
  if (!c) return;
  const texto = `🤝 *${c.nombre}*\n📍 ${c.estado} · ${c.direccion}\n📞 ${c.telefono}\n${c.mapsUrl||''}\n\nComparte para que más personas puedan ayudar 🇻🇪`;
  if (navigator.share) {
    navigator.share({ title: c.nombre, text: texto }).catch(()=>{});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(()=>mostrarToast('Información copiada al portapapeles'));
  } else {
    mostrarToast('Copia: ' + c.telefono);
  }
}

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2800);
}

// ─── URGENCIA ────────────────────────────────────────────────
function selUrgencia(nivel) {
  urgenciaSeleccionada = nivel;
  ['alta','media','baja'].forEach(n => {
    const btn = document.getElementById('urg-'+n);
    btn.className = 'urg-btn';
    if (n === nivel) btn.classList.add('sel-'+n);
  });
}

// ─── PUBLICAR ────────────────────────────────────────────────
async function publicarCentro() {
  const errorEl = document.getElementById('error-msg');
  errorEl.style.display = 'none';

  if (!supabaseClient) {
    errorEl.textContent = '⚠️ Supabase no está configurado. Revisa SUPABASE_URL y SUPABASE_ANON_KEY en script.js.';
    errorEl.style.display = 'block';
    return;
  }

  const nombre      = document.getElementById('f-nombre').value.trim();
  const estado      = document.getElementById('f-estado').value;
  const direccion   = document.getElementById('f-direccion').value.trim();
  const mapsUrlRaw  = document.getElementById('f-maps').value.trim();
  const mapsUrl     = normalizeMapsUrl(mapsUrlRaw);
  const responsable = document.getElementById('f-responsable').value.trim();
  const cedula      = document.getElementById('f-cedula').value.trim();
  const correo      = document.getElementById('f-correo').value.trim();
  const telefono    = document.getElementById('f-telefono').value.trim();
  const horario     = document.getElementById('f-horario').value.trim();
  const descripcion = document.getElementById('f-descripcion').value.trim();
  const tipos       = [...document.querySelectorAll('.checkbox-grid input:checked')].map(i=>i.value);
  const imagenData  = imagenSeleccionadaData;

  const errores = [];
  if (!nombre)      errores.push('el nombre del centro');
  if (!estado)      errores.push('el estado');
  if (!direccion)   errores.push('la dirección');
  if (!mapsUrl)     errores.push('el enlace de Google Maps');
  if (!responsable) errores.push('el nombre del responsable');
  if (!cedula)      errores.push('la cédula o identificación');
  if (!correo)      errores.push('el correo electrónico');
  if (!descripcion) errores.push('la descripción');
  if (!urgenciaSeleccionada) errores.push('el nivel de urgencia');

  if (errores.length) {
    errorEl.textContent = '⚠️ Por favor completa: ' + errores.join(', ') + '.';
    errorEl.style.display = 'block';
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const isEdit = !!editCentroId;
  const id = isEdit ? editCentroId : 'c_' + Date.now();
  const existingCentro = isEdit ? centros.find(c => c.id === editCentroId) : null;
  const recordBase = {
    id,
    nombre,
    estado,
    direccion,
    maps_url: mapsUrl || null,
    responsable,
    cedula,
    correo,
    telefono,
    horario,
    descripcion,
    tipos: tipos || [],
    urgencia: urgenciaSeleccionada,
    fecha_publicacion: isEdit && existingCentro ? existingCentro.fecha_publicacion || new Date().toISOString() : new Date().toISOString(),
    creator_id: userId,
    creator_ip: userIp || null,
    extra: {}
  };

  try {
    const file = document.getElementById('f-imagen').files[0];
    let publicUrl = isEdit && existingCentro ? existingCentro.image_url || existingCentro.imageData || null : null;
    if (file) publicUrl = await uploadImageToBucket(file);

    const dbCentro = {
      ...recordBase,
      image_url: publicUrl,
      image_data: null
    };

    if (isEdit) {
      await updateCentroInDb(id, dbCentro);
      const existing = centros.find(c => c.id === id);
      if (existing) {
        existing.nombre = nombre;
        existing.estado = estado;
        existing.direccion = direccion;
        existing.mapsUrl = mapsUrl;
        existing.responsable = responsable;
        existing.cedula = cedula;
        existing.correo = correo;
        existing.telefono = telefono;
        existing.horario = horario;
        existing.descripcion = descripcion;
        existing.tipos = tipos;
        existing.imageData = publicUrl || imagenData;
        existing.image_url = publicUrl || existing.image_url;
        existing.urgencia = urgenciaSeleccionada;
        existing.creatorId = userId;
        existing.creatorIp = userIp || existing.creatorIp || 'desconocido';
      }
    } else {
      await createCentroInDb(dbCentro);
      const nuevo = {
        id,
        nombre,
        estado,
        direccion,
        mapsUrl,
        responsable,
        cedula,
        correo,
        telefono,
        horario,
        descripcion,
        tipos,
        imageData: publicUrl,
        image_url: publicUrl,
        urgencia: urgenciaSeleccionada,
        fechaPublicacion: new Date().toLocaleDateString('es-VE'),
        creatorId: userId,
        creatorIp: userIp || 'desconocido'
      };
      centros.unshift(nuevo);
    }

    resetForm();
    const banner = document.getElementById('success-banner');
    banner.style.display = 'flex';
    setTimeout(()=>{ banner.style.display='none'; }, 5000);
    showTab('ver');
    filtroEstado = 'todos';
    renderLista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  } catch (err) {
    console.error('Supabase upload/insert error', err);
    mostrarToast('Error al subir la imagen o guardar en Supabase');
    return;
  }
}

// ─── TABS ────────────────────────────────────────────────────
function showTab(tab) {
  document.getElementById('view-ver').classList.toggle('active', tab==='ver');
  document.getElementById('view-publicar').classList.toggle('active', tab==='publicar');
  document.getElementById('tab-ver').classList.toggle('active', tab==='ver');
  document.getElementById('tab-publicar').classList.toggle('active', tab==='publicar');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── INIT ────────────────────────────────────────────────────
(async function() {
  if (supabaseClient) {
    await loadCentrosFromDb();
  }
  renderLista();
})();

// --- Utility: test connection to Supabase from browser console ---
async function testSupabase() {
  console.log('supabaseClient initialized:', !!supabaseClient);
  if (!supabaseClient) {
    console.warn('Supabase client no inicializado. Revisa SUPABASE_URL y SUPABASE_ANON_KEY en script.js');
    return;
  }
  try {
    const { data, error } = await supabaseClient.from('centros').select().limit(1);
    console.log('supabase test select result:', { data, error });
    if (error) console.error('Supabase returned error:', error);
  } catch (e) {
    console.error('Error probando Supabase:', e);
  }
}
