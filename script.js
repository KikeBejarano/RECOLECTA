// ─── STORAGE ────────────────────────────────────────────────
const STORAGE_KEY = 'centros_acopio_ve_v1';

function cargarCentros() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch(e) { return []; }
}

function guardarCentros(centros) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(centros)); } catch(e) {}
}

// ─── ESTADO ─────────────────────────────────────────────────
let centros = cargarCentros();
let filtroEstado = 'todos';
let expandidoId = null;
let urgenciaSeleccionada = null;

// ─── BADGE HELPERS ───────────────────────────────────────────
const badgeClass = {
  'Alimentos':'food','Agua':'water','Medicinas':'medical',
  'Ropa':'clothes','Higiene':'clothes','Pañales':'clothes',
  'Herramientas':'tools','Voluntarios':'tools','Dinero':'food','Otro':'tools'
};

function badgeHTML(tipo) {
  return `<span class="badge ${badgeClass[tipo]||'tools'}">${tipo}</span>`;
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
          <div class="detail-row"><span class="di">📞</span><span>${c.telefono}</span></div>

          ${(c.tipos||[]).length ? `
          <div class="detail-tipos">
            <div class="label">Reciben:</div>
            <div class="card-badges">${(c.tipos||[]).map(t=>badgeHTML(t)).join('')}</div>
          </div>` : ''}

          <div class="detail-actions">
            ${c.mapsUrl ? `<a class="btn-maps" href="${c.mapsUrl}" target="_blank" rel="noopener">📍 Ver en Google Maps</a>` : ''}
            ${whatsapp ? `<a class="btn-primary" href="${whatsapp}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
            <button class="btn-outline" onclick="compartirCentro('${c.id}')">🔗 Compartir</button>
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
function publicarCentro() {
  const errorEl = document.getElementById('error-msg');
  errorEl.style.display = 'none';

  const nombre      = document.getElementById('f-nombre').value.trim();
  const estado      = document.getElementById('f-estado').value;
  const direccion   = document.getElementById('f-direccion').value.trim();
  const mapsUrl     = document.getElementById('f-maps').value.trim();
  const responsable = document.getElementById('f-responsable').value.trim();
  const telefono    = document.getElementById('f-telefono').value.trim();
  const horario     = document.getElementById('f-horario').value.trim();
  const descripcion = document.getElementById('f-descripcion').value.trim();
  const tipos       = [...document.querySelectorAll('.checkbox-grid input:checked')].map(i=>i.value);

  // Validación
  const errores = [];
  if (!nombre)      errores.push('el nombre del centro');
  if (!estado)      errores.push('el estado');
  if (!direccion)   errores.push('la dirección');
  if (!mapsUrl)     errores.push('el enlace de Google Maps');
  if (!responsable) errores.push('el nombre del responsable');
  if (!telefono)    errores.push('el número de teléfono');
  if (!descripcion) errores.push('la descripción');
  if (!urgenciaSeleccionada) errores.push('el nivel de urgencia');

  if (errores.length) {
    errorEl.textContent = '⚠️ Por favor completa: ' + errores.join(', ') + '.';
    errorEl.style.display = 'block';
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const nuevo = {
    id: 'c_' + Date.now(),
    nombre, estado, direccion, mapsUrl,
    responsable, telefono, horario,
    descripcion, tipos,
    urgencia: urgenciaSeleccionada,
    fechaPublicacion: new Date().toLocaleDateString('es-VE')
  };

  centros.unshift(nuevo);
  guardarCentros(centros);

  // Limpiar formulario
  ['f-nombre','f-direccion','f-maps','f-responsable','f-telefono','f-horario','f-descripcion'].forEach(id=>{
    document.getElementById(id).value = '';
  });
  document.getElementById('f-estado').value = '';
  document.querySelectorAll('.checkbox-grid input').forEach(i=>i.checked=false);
  ['alta','media','baja'].forEach(n=>{ document.getElementById('urg-'+n).className='urg-btn'; });
  urgenciaSeleccionada = null;

  // Mostrar éxito y volver a la lista
  const banner = document.getElementById('success-banner');
  banner.style.display = 'flex';
  setTimeout(()=>{ banner.style.display='none'; }, 5000);

  showTab('ver');
  filtroEstado = 'todos';
  renderLista();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
renderLista();
