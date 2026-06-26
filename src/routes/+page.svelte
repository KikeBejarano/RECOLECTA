<script lang="ts">
  import { onMount } from 'svelte';
  import CenterMap from '$lib/CenterMap.svelte';
  import LocationPicker from '$lib/LocationPicker.svelte';
  import {
    badgeClass,
    donationTypes,
    emptyForm,
    formFromCenter,
    fromRecord,
    getUserId,
    isOwned,
    normalizeMapsUrl,
    shareText,
    toRecord,
    urgencyLabel,
    urgencyTone,
    validateCenterForm,
    venezuelaStates,
    whatsappUrl,
    type Center,
    type CenterForm,
    type Tab,
    type Urgency
  } from '$lib/centers';
  import {
    createCenter,
    deleteCenter,
    loadCenters,
    supabaseConfigured,
    updateCenter,
    uploadCenterImage
  } from '$lib/supabase';

  let activeTab: Tab = 'ver';
  let centers: Center[] = [];
  let filterState = 'todos';
  let query = '';
  let expandedId: string | null = null;
  let toastMessage = '';
  let successMessage = '';
  let errorMessage = '';
  let loading = true;
  let saving = false;
  let imagePreview: string | null = null;
  let selectedImage: File | null = null;
  let editCenterId: string | null = null;
  let userId = '';
  let userIp: string | null = null;
  let form: CenterForm = { ...emptyForm, tipos: [] };

  $: filteredCenters = centers.filter((center) => {
    const search = query.toLowerCase().trim();
    const matchesState = filterState === 'todos' || center.estado === filterState;
    const matchesSearch =
      !search ||
      center.nombre.toLowerCase().includes(search) ||
      center.estado.toLowerCase().includes(search) ||
      center.direccion.toLowerCase().includes(search) ||
      center.descripcion.toLowerCase().includes(search);

    return matchesState && matchesSearch;
  });

  $: visibleStates = ['todos', ...new Set(centers.map((center) => center.estado).filter(Boolean))].slice(
    0,
    10
  );

  $: highUrgencyCount = centers.filter((center) => center.urgencia === 'alta').length;
  $: stateCount = new Set(centers.map((center) => center.estado).filter(Boolean)).size;
  $: selectedCenter = editCenterId ? centers.find((center) => center.id === editCenterId) || null : null;

  onMount(async () => {
    userId = getUserId();
    userIp = localStorage.getItem('centros_acopio_ve_user_ip');

    if (!userIp) {
      fetch('https://api.ipify.org?format=json')
        .then((response) => response.json())
        .then((data) => {
          if (data?.ip) {
            userIp = data.ip;
            localStorage.setItem('centros_acopio_ve_user_ip', data.ip);
          }
        })
        .catch(() => undefined);
    }

    if (!supabaseConfigured) {
      loading = false;
      errorMessage =
        'Supabase no esta configurado. Agrega PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY para cargar centros.';
      return;
    }

    try {
      const records = await loadCenters();
      centers = records.map(fromRecord);
    } catch (error) {
      console.error('Supabase load error', error);
      errorMessage = 'No se pudieron cargar los centros desde Supabase. Revisa la configuracion.';
    } finally {
      loading = false;
    }
  });

  function showTab(tab: Tab) {
    activeTab = tab;
    errorMessage = '';
    successMessage = '';
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setFilter(state: string) {
    filterState = state;
  }

  function toggleCenter(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function setUrgency(urgency: Urgency) {
    form = { ...form, urgencia: urgency };
  }

  function toggleDonationType(type: string) {
    const exists = form.tipos.includes(type);
    form = {
      ...form,
      tipos: exists ? form.tipos.filter((item) => item !== type) : [...form.tipos, type]
    };
  }

  function onImageChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] || null;
    selectedImage = file;

    if (!file) {
      imagePreview = selectedCenter?.imageUrl || null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      imagePreview = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  function resetForm() {
    form = { ...emptyForm, tipos: [] };
    selectedImage = null;
    imagePreview = null;
    editCenterId = null;
    errorMessage = '';
  }

  function editCenter(center: Center) {
    if (!isOwned(center, userId, userIp)) return;
    editCenterId = center.id;
    form = formFromCenter(center);
    imagePreview = center.imageUrl;
    selectedImage = null;
    showTab('publicar');
  }

  async function removeCenter(center: Center) {
    if (!isOwned(center, userId, userIp)) return;
    if (!confirm('Eliminar este centro de acopio?')) return;

    try {
      await deleteCenter(center.id);
      centers = centers.filter((item) => item.id !== center.id);
      notify('Centro eliminado');
    } catch (error) {
      console.error('Supabase delete error', error);
      notify('No se pudo eliminar el centro');
    }
  }

  async function submitCenter() {
    errorMessage = '';
    successMessage = '';

    if (!supabaseConfigured) {
      errorMessage = 'Supabase no esta configurado. Revisa las variables publicas de entorno.';
      return;
    }

    const errors = validateCenterForm(form);
    if (errors.length > 0) {
      errorMessage = `Por favor completa: ${errors.join(', ')}.`;
      return;
    }

    saving = true;
    const isEdit = Boolean(editCenterId);
    const existing = editCenterId ? centers.find((center) => center.id === editCenterId) || null : null;
    const id = editCenterId || `c_${Date.now()}`;

    try {
      let imageUrl = existing?.imageUrl || null;
      if (selectedImage) imageUrl = await uploadCenterImage(selectedImage);

      const record = toRecord(form, id, userId, userIp, imageUrl, existing?.fecha_publicacion);
      const saved = isEdit ? await updateCenter(id, record) : await createCenter(record);
      const nextCenter = fromRecord(saved || record);

      centers = isEdit
        ? centers.map((center) => (center.id === id ? nextCenter : center))
        : [nextCenter, ...centers];

      resetForm();
      filterState = 'todos';
      activeTab = 'ver';
      successMessage = isEdit ? 'Centro actualizado exitosamente.' : 'Centro publicado exitosamente.';
      notify(successMessage);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Supabase save error', error);
      errorMessage = 'No se pudo guardar el centro. Revisa permisos de tabla, RLS o Storage.';
    } finally {
      saving = false;
    }
  }

  async function shareCenter(center: Center) {
    const text = shareText(center);

    if (navigator.share) {
      await navigator.share({ title: center.nombre, text }).catch(() => undefined);
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      notify('Informacion copiada al portapapeles');
      return;
    }

    notify(center.telefono ? `Telefono: ${center.telefono}` : 'Copia los datos del centro');
  }

  function notify(message: string) {
    toastMessage = message;
    setTimeout(() => {
      toastMessage = '';
    }, 2800);
  }
</script>

<svelte:head>
  <title>RECOLECTA</title>
  <meta
    name="description"
    content="Directorio de centros de acopio y ayuda para la emergencia por los terremoto de Venezuela."
  />
</svelte:head>

<main class="app-shell">
  <header class="topbar">
    <button class="brand" type="button" on:click={() => showTab('ver')} aria-label="Ir al directorio">
      <span class="brand-mark">R</span>
      <span>
        <strong>RECOLECTA</strong>
        <small>Directorio de centros de acopio</small>
      </span>
    </button>

    <nav class="top-actions" aria-label="Secciones">
      <button class:active={activeTab === 'ver'} type="button" on:click={() => showTab('ver')}>Directorio</button>
      <button class:active={activeTab === 'publicar'} type="button" on:click={() => showTab('publicar')}>
        Publicar centro
      </button>
    </nav>
  </header>

  {#if successMessage}
    <section class="notice success" aria-live="polite">{successMessage}</section>
  {/if}

  {#if activeTab === 'ver'}
    <section class="hero-panel" aria-labelledby="directory-title">
      <div>
        <p class="section-label">Directorio operativo</p>
        <h1 id="directory-title">Centros de acopio que reciben donaciones para Venezuela</h1>
      </div>
      <button class="primary-action" type="button" on:click={() => showTab('publicar')}>Publicar centro</button>
    </section>

    <section class="stats-grid" aria-label="Resumen de centros">
      <article>
        <strong>{centers.length}</strong>
        <span>Centros activos</span>
      </article>
      <article>
        <strong>{highUrgencyCount}</strong>
        <span>Urgencia alta</span>
      </article>
      <article>
        <strong>{stateCount}</strong>
        <span>Estados</span>
      </article>
    </section>

    <section class="directory-tools" aria-label="Busqueda y filtros">
      <label class="search-box">
        <span>Buscar</span>
        <input
          bind:value={query}
          type="search"
          placeholder="Nombre, ciudad, estado o descripcion"
          autocomplete="off"
        />
      </label>

      <div class="chips" aria-label="Filtrar por estado">
        {#each visibleStates as state}
          <button class:active={filterState === state} type="button" on:click={() => setFilter(state)}>
            {state === 'todos' ? 'Todos' : state}
          </button>
        {/each}
      </div>
    </section>

    {#if errorMessage}
      <section class="notice error" aria-live="assertive">{errorMessage}</section>
    {/if}

    {#if loading}
      <section class="empty-state">
        <h2>Cargando centros</h2>
        <p>Estamos consultando el directorio.</p>
      </section>
    {:else if centers.length === 0}
      <section class="empty-state">
        <h2>Aun no hay centros registrados</h2>
        <p>Publica un centro de acopio para que otras personas sepan donde llevar ayuda.</p>
        <button type="button" on:click={() => showTab('publicar')}>Publicar el primer centro</button>
      </section>
    {:else if filteredCenters.length === 0}
      <section class="empty-state">
        <h2>No se encontraron centros</h2>
        <p>Prueba con otro termino de busqueda o vuelve al filtro de todos los estados.</p>
      </section>
    {:else}
      <section class="center-list" aria-label="Lista de centros">
        {#each filteredCenters as center}
          {@const owned = isOwned(center, userId, userIp)}
          {@const waUrl = whatsappUrl(center)}
          <article class:expanded={expandedId === center.id} class="center-card">
            {#if center.imageUrl}
              <img class="center-image" src={center.imageUrl} alt={`Imagen del centro ${center.nombre}`} />
            {/if}

            <button class="center-summary" type="button" on:click={() => toggleCenter(center.id)}>
              <span class={`urgency-dot ${urgencyTone[center.urgencia]}`}></span>
              <span class="summary-main">
                <strong>{center.nombre}</strong>
                <small>{center.estado} · {center.direccion}</small>
              </span>
              <span class={`urgency-pill ${urgencyTone[center.urgencia]}`}>
                {urgencyLabel[center.urgencia]}
              </span>
              <span class="chevron" aria-hidden="true">⌄</span>
            </button>

            <div class="center-badges" aria-label="Tipos de donacion">
              {#each center.tipos.slice(0, 5) as type}
                <span class={`badge ${badgeClass[type] || 'tools'}`}>{type}</span>
              {/each}
              {#if center.tipos.length > 5}
                <span class="badge tools">+{center.tipos.length - 5}</span>
              {/if}
            </div>

            {#if expandedId === center.id}
              <div class="center-detail">
                {#if center.descripcion}<p>{center.descripcion}</p>{/if}
                <dl>
                  {#if center.horario}
                    <div><dt>Horario</dt><dd>{center.horario}</dd></div>
                  {/if}
                  <div><dt>Responsable</dt><dd>{center.responsable}</dd></div>
                  {#if center.cedula}<div><dt>Cedula / ID</dt><dd>{center.cedula}</dd></div>{/if}
                  {#if center.correo}<div><dt>Correo</dt><dd>{center.correo}</dd></div>{/if}
                  {#if center.telefono}<div><dt>Telefono</dt><dd>{center.telefono}</dd></div>{/if}
                </dl>

                {#if center.tipos.length}
                  <div class="all-types">
                    {#each center.tipos as type}
                      <span class={`badge ${badgeClass[type] || 'tools'}`}>{type}</span>
                    {/each}
                  </div>
                {/if}

                <CenterMap mapsUrl={center.mapsUrl} title={center.nombre} />

                <div class="detail-actions">
                  {#if center.mapsUrl}
                    <a class="map-action" href={center.mapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
                  {/if}
                  {#if waUrl}
                    <a class="contact-action" href={waUrl} target="_blank" rel="noreferrer">WhatsApp</a>
                  {/if}
                  <button type="button" on:click={() => shareCenter(center)}>Compartir</button>
                  {#if owned}
                    <button type="button" on:click={() => editCenter(center)}>Editar</button>
                    <button class="danger" type="button" on:click={() => removeCenter(center)}>Borrar</button>
                  {/if}
                </div>
              </div>
            {/if}
          </article>
        {/each}
      </section>
    {/if}
  {:else}
    <section class="form-shell" aria-labelledby="form-title">
      <div class="form-heading">
        <div>
          <p class="section-label">{editCenterId ? 'Edicion' : 'Nuevo centro'}</p>
          <h1 id="form-title">{editCenterId ? 'Editar publicacion' : 'Publicar centro de acopio'}</h1>
        </div>
        {#if editCenterId}
          <button class="secondary-action" type="button" on:click={resetForm}>Cancelar edicion</button>
        {/if}
      </div>

      {#if errorMessage}
        <section class="notice error" aria-live="assertive">{errorMessage}</section>
      {/if}

      <form class="center-form" on:submit|preventDefault={submitCenter}>
        <section>
          <h2>Informacion del centro</h2>
          <label>
            Nombre del centro *
            <input bind:value={form.nombre} maxlength="100" placeholder="Ej: Iglesia San Francisco - Acopio Zona Norte" />
          </label>
          <label>
            Estado / Ciudad *
            <select bind:value={form.estado}>
              <option value="">Seleccionar estado...</option>
              {#each venezuelaStates as state}
                <option value={state}>{state}</option>
              {/each}
            </select>
          </label>
          <label>
            Direccion exacta *
            <input bind:value={form.direccion} placeholder="Calle, urbanizacion, sector o punto de referencia" />
          </label>
          <label>
            Enlace de Google Maps *
            <input bind:value={form.mapsUrl} type="url" placeholder="https://maps.app.goo.gl/..." />
          </label>
          <LocationPicker
            mapsUrl={form.mapsUrl}
            onSelect={(mapsUrl) => {
              form = { ...form, mapsUrl };
            }}
          />
          <label>
            Imagen del centro
            <input type="file" accept="image/*" on:change={onImageChange} />
          </label>
          {#if imagePreview}
            <img class="image-preview" src={imagePreview} alt="Previsualizacion de imagen" />
          {/if}
        </section>

        <section>
          <h2>Contacto</h2>
          <label>
            Nombre del contacto *
            <input bind:value={form.responsable} placeholder="Nombre completo de quien coordina el centro" />
          </label>
          <label>
            Cedula / Identificacion *
            <input bind:value={form.cedula} placeholder="Ej: V-12345678" />
          </label>
          <label>
            Correo electronico *
            <input bind:value={form.correo} type="email" placeholder="nombre@correo.com" />
          </label>
          <label>
            Numero de telefono / WhatsApp
            <input bind:value={form.telefono} type="tel" placeholder="Ej: 0412-555-0101" />
          </label>
          <label>
            Horario de atencion
            <input bind:value={form.horario} placeholder="Ej: Lun-Vie 8am-6pm, Sabados 9am-2pm" />
          </label>
        </section>

        <section>
          <h2>Que reciben</h2>
          <div class="checkbox-grid">
            {#each donationTypes as type}
              <label class="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.tipos.includes(type)}
                  on:change={() => toggleDonationType(type)}
                />
                <span>{type}</span>
              </label>
            {/each}
          </div>
        </section>

        <section>
          <h2>Descripcion y urgencia</h2>
          <div class="urgency-toggle" role="group" aria-label="Nivel de urgencia">
            {#each Object.entries(urgencyLabel) as [key, label]}
              <button
                class:selected={form.urgencia === key}
                class={urgencyTone[key as Urgency]}
                type="button"
                on:click={() => setUrgency(key as Urgency)}
              >
                {label}
              </button>
            {/each}
          </div>
          <label>
            Descripcion *
            <textarea
              bind:value={form.descripcion}
              placeholder="Describe que articulos necesitan con mas urgencia, a quienes ayudan e instrucciones especiales."
            ></textarea>
          </label>
        </section>

        <button class="submit-action" type="submit" disabled={saving}>
          {saving ? 'Guardando...' : editCenterId ? 'Guardar cambios' : 'Publicar centro ahora'}
        </button>
      </form>
    </section>
  {/if}
</main>

{#if toastMessage}
  <div class="toast" role="status">{toastMessage}</div>
{/if}
