/* ============================================================
   PANEL DE ADMINISTRACIÓN — Anita Mishel (conectado a Supabase)
   ------------------------------------------------------------
   - Login de la administradora con Supabase Auth.
   - Clientes, bitácora y notas se guardan en Supabase.
   - Crear cliente: crea su acceso (usuario+clave) y su registro.
   Nota: cambiar clave o borrar el acceso por completo requiere
   una pieza extra (se agrega más adelante).
   ============================================================ */

/* ----------  REFERENCIAS DOM  ---------- */
const grid        = document.getElementById('clientesGrid');
const emptyState  = document.getElementById('emptyState');
const adminCount  = document.getElementById('adminCount');
const buscador    = document.getElementById('buscador');

const overlay     = document.getElementById('modalOverlay');
const modalTitle  = document.getElementById('modalTitle');
const form        = document.getElementById('clienteForm');
const btnEliminar = document.getElementById('btnEliminar');
const toast       = document.getElementById('toast');

const accesoSection = document.getElementById('accesoSection');
const accesoRow     = accesoSection.querySelector('.form-row');
const accesoNota    = document.getElementById('accesoNota');

const campos = {
    id:          document.getElementById('clienteId'),
    nombre:      document.getElementById('nombre'),
    universidad: document.getElementById('universidad'),
    carrera:     document.getElementById('carrera'),
    nivel:       document.getElementById('nivel'),
    usuario:     document.getElementById('usuario'),
    clave:       document.getElementById('clave'),
    tesis:       document.getElementById('avanceTesis'),
    pagos:       document.getElementById('avancePagos'),
};
const valTesis = document.getElementById('valTesis');
const valPagos = document.getElementById('valPagos');

const bitacoraAdmin = document.getElementById('bitacoraAdmin');
const bitacoraLista = document.getElementById('bitacoraLista');
const bitFecha      = document.getElementById('bitFecha');
const bitActividad  = document.getElementById('bitActividad');
const bitNotas      = document.getElementById('bitNotas');

// Login admin
const adminLogin      = document.getElementById('adminLogin');
const adminLoginForm  = document.getElementById('adminLoginForm');
const adminLoginError = document.getElementById('adminLoginError');

const citasAdmin      = document.getElementById('citasAdmin');
const citasAdminLista = document.getElementById('citasAdminLista');
const citasCount      = document.getElementById('citasCount');
const gestionOverlay  = document.getElementById('gestionCitaOverlay');
const gestionInfo     = document.getElementById('gestionCitaInfo');
const gestionFecha    = document.getElementById('gestionCitaFecha');
const gestionNota     = document.getElementById('gestionCitaNota');
const gestionId       = document.getElementById('gestionCitaId');

let clientes = [];        // cache en memoria de lo cargado
let notasPorCliente = {}; // conteo de notas por bitácora (para el editor)

/* ----------  UTILIDADES  ---------- */
function iniciales(nombre) {
    return (nombre || '').trim().split(/\s+/).slice(0, 2).map(p => p[0] ? p[0].toUpperCase() : '').join('');
}
function generarClave() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}
function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
function mostrarToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(mostrarToast._t);
    mostrarToast._t = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.hidden = true; }, 300);
    }, 2800);
}
function fechaCorta(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Cliente temporal para crear accesos sin afectar la sesión del admin
function makeTempClient() {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-temp-signup' }
    });
}

/* ============================================================
   AUTENTICACIÓN DEL ADMIN
   ============================================================ */
async function verificarAdmin() {
    const { data, error } = await sb.rpc('is_admin');
    if (error) return false;
    return data === true;
}

function mostrarLogin() {
    document.body.classList.add('no-auth');
    adminLogin.hidden = false;
}

async function entrarApp() {
    adminLogin.hidden = true;
    document.body.classList.remove('no-auth');
    await cargarClientes();
    await cargarCitasPendientes();
}

async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        if (await verificarAdmin()) { await entrarApp(); return; }
        await sb.auth.signOut();
    }
    mostrarLogin();
}

adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminLoginError.hidden = true;
    const email = document.getElementById('adminEmail').value.trim();
    const pass  = document.getElementById('adminPass').value;
    const btn = adminLoginForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Ingresando...';

    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
        adminLoginError.textContent = 'Correo o clave incorrectos.';
        adminLoginError.hidden = false;
        btn.disabled = false; btn.textContent = 'Ingresar';
        return;
    }
    if (!(await verificarAdmin())) {
        await sb.auth.signOut();
        adminLoginError.textContent = 'Esta cuenta no tiene acceso de administración.';
        adminLoginError.hidden = false;
        btn.disabled = false; btn.textContent = 'Ingresar';
        return;
    }
    btn.disabled = false; btn.textContent = 'Ingresar';
    await entrarApp();
});

document.getElementById('btnSalirAdmin').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.reload();
});

/* ============================================================
   CARGA Y RENDER DE CLIENTES
   ============================================================ */
async function cargarClientes() {
    const { data, error } = await sb.from('clientes').select('*').order('creado', { ascending: false });
    if (error) { mostrarToast('Error cargando clientes.'); clientes = []; }
    else clientes = data || [];
    render(buscador.value);
}

function render(filtro = '') {
    const f = (filtro || '').trim().toLowerCase();
    const lista = clientes.filter(c =>
        !f ||
        (c.nombre || '').toLowerCase().includes(f) ||
        (c.universidad || '').toLowerCase().includes(f) ||
        (c.carrera || '').toLowerCase().includes(f)
    );

    adminCount.textContent = clientes.length + (clientes.length === 1 ? ' cliente' : ' clientes');

    if (clientes.length === 0) {
        grid.innerHTML = '';
        emptyState.hidden = false;
        return;
    }
    emptyState.hidden = true;

    if (lista.length === 0) {
        grid.innerHTML = '<p style="color:var(--color-text-muted);grid-column:1/-1;text-align:center;padding:40px 0;">Ningún cliente coincide con la búsqueda.</p>';
        return;
    }

    grid.innerHTML = lista.map(c => `
        <div class="cliente-card" data-id="${c.id}">
            <div class="cliente-head">
                <div class="cliente-avatar">${escapeHtml(iniciales(c.nombre))}</div>
                <div class="cliente-info">
                    <h3>${escapeHtml(c.nombre)}</h3>
                    <p>${escapeHtml(c.universidad)} · ${escapeHtml(c.carrera)}</p>
                </div>
                <span class="cliente-nivel">${escapeHtml(c.nivel || 'Posgrado')}</span>
            </div>
            <div class="avance-block">
                <div class="avance-top">
                    <span class="avance-label">Elaboración de tesis</span>
                    <span class="avance-pct">${c.avance_tesis}%</span>
                </div>
                <div class="avance-bar"><div class="avance-fill tesis" style="width:${c.avance_tesis}%"></div></div>
            </div>
            <div class="avance-block">
                <div class="avance-top">
                    <span class="avance-label">Pagos</span>
                    <span class="avance-pct">${c.avance_pagos}%</span>
                </div>
                <div class="avance-bar"><div class="avance-fill pagos" style="width:${c.avance_pagos}%"></div></div>
            </div>
        </div>
    `).join('');
}

/* ============================================================
   MODAL CREAR / EDITAR
   ============================================================ */
function abrirModal(cliente = null) {
    form.reset();
    if (cliente) {
        modalTitle.textContent = 'Editar cliente';
        campos.id.value          = cliente.id;
        campos.nombre.value      = cliente.nombre;
        campos.universidad.value = cliente.universidad || '';
        campos.carrera.value     = cliente.carrera || '';
        campos.nivel.value       = cliente.nivel || 'Posgrado';
        campos.tesis.value       = cliente.avance_tesis;
        campos.pagos.value       = cliente.avance_pagos;
        btnEliminar.hidden = false;
        // En edición no se cambian usuario/clave
        accesoRow.hidden = true;
        accesoNota.hidden = false;
        bitacoraAdmin.hidden = false;
        renderBitacora(cliente.id);
    } else {
        modalTitle.textContent = 'Nuevo cliente';
        campos.id.value = '';
        campos.tesis.value = 0;
        campos.pagos.value = 0;
        btnEliminar.hidden = true;
        accesoRow.hidden = false;
        accesoNota.hidden = true;
        bitacoraAdmin.hidden = true;
    }
    actualizarValores();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => campos.nombre.focus(), 50);
}
function cerrarModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
}
function actualizarValores() {
    valTesis.textContent = campos.tesis.value;
    valPagos.textContent = campos.pagos.value;
}

/* ============================================================
   BITÁCORA (editor del admin)
   ============================================================ */
async function renderBitacora(clienteId) {
    bitacoraLista.innerHTML = '<p class="bitacora-vacia">Cargando...</p>';

    const [entradasRes, notasRes] = await Promise.all([
        sb.from('bitacora').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: true }),
        sb.from('notas_cliente').select('id, bitacora_id, texto, documento_path, creado').eq('cliente_id', clienteId).order('creado', { ascending: true })
    ]);

    if (entradasRes.error) { bitacoraLista.innerHTML = '<p class="bitacora-vacia">Error al cargar la bitácora.</p>'; return; }
    if (notasRes.error) { console.error('Error leyendo notas del cliente:', notasRes.error); }

    const entradas = entradasRes.data || [];
    const notas = notasRes.data || [];

    // Agrupar las notas del cliente por entrada
    const porEntrada = {};
    notas.forEach(n => { (porEntrada[n.bitacora_id] = porEntrada[n.bitacora_id] || []).push(n); });

    if (entradas.length === 0) {
        bitacoraLista.innerHTML = '<p class="bitacora-vacia">Aún no hay entradas. Agrega la primera arriba.</p>';
        return;
    }

    bitacoraLista.innerHTML = entradas.map(e => {
        const mis = (porEntrada[e.id] || []).map(n => `
            <div class="bitacora-nota-cli">
                ${n.texto ? escapeHtml(n.texto) : ''}
                ${n.documento_path ? `<a href="#" class="bitacora-doc" data-path="${escapeHtml(n.documento_path)}">📎 Ver documento</a>` : ''}
            </div>`).join('');
        return `
        <div class="bitacora-item">
            <div class="bitacora-item-head">
                <span class="bitacora-item-fecha">${escapeHtml(fechaCorta(e.fecha))}</span>
                <button type="button" class="bitacora-item-del" data-del="${e.id}" title="Eliminar entrada">✕</button>
            </div>
            <div class="bitacora-item-act">${escapeHtml(e.actividad)}</div>
            ${e.notas_asesor ? `<div class="bitacora-item-notas">${escapeHtml(e.notas_asesor)}</div>` : ''}
            ${mis ? `<div class="bitacora-item-cli"><span class="bitacora-cli-etq">Del cliente:</span>${mis}</div>` : ''}
        </div>`;
    }).join('');
}

document.getElementById('btnAddBitacora').addEventListener('click', async () => {
    const id = campos.id.value;
    if (!id) return;
    const fecha = bitFecha.value;
    const actividad = bitActividad.value.trim();
    const notas = bitNotas.value.trim();
    if (!fecha) { mostrarToast('Elige una fecha.'); return; }
    if (!actividad) { mostrarToast('Escribe la actividad realizada.'); return; }

    const { error } = await sb.from('bitacora').insert({
        cliente_id: id, fecha, actividad, notas_asesor: notas || null
    });
    if (error) { mostrarToast('Error al guardar la entrada.'); return; }

    bitFecha.value = ''; bitActividad.value = ''; bitNotas.value = '';
    renderBitacora(id);
    mostrarToast('Entrada agregada.');
});

bitacoraLista.addEventListener('click', async (e) => {
    // Abrir documento del cliente
    const doc = e.target.closest('.bitacora-doc');
    if (doc) {
        e.preventDefault();
        const { data, error } = await sb.storage.from('documentos').createSignedUrl(doc.dataset.path, 60);
        if (error || !data) { mostrarToast('No se pudo abrir el documento.'); return; }
        window.open(data.signedUrl, '_blank');
        return;
    }

    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const id = campos.id.value;
    if (!confirm('¿Eliminar esta entrada de la bitácora?')) return;
    const { error } = await sb.from('bitacora').delete().eq('id', btn.dataset.del);
    if (error) { mostrarToast('Error al eliminar.'); return; }
    renderBitacora(id);
    mostrarToast('Entrada eliminada.');
});

/* ============================================================
   EVENTOS GENERALES
   ============================================================ */
document.getElementById('btnNuevo').addEventListener('click', () => abrirModal());
document.getElementById('btnNuevoVacio').addEventListener('click', () => abrirModal());
document.getElementById('modalClose').addEventListener('click', cerrarModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) cerrarModal(); });

campos.tesis.addEventListener('input', actualizarValores);
campos.pagos.addEventListener('input', actualizarValores);
document.getElementById('btnGenerar').addEventListener('click', () => { campos.clave.value = generarClave(); });
buscador.addEventListener('input', (e) => render(e.target.value));

grid.addEventListener('click', (e) => {
    const card = e.target.closest('.cliente-card');
    if (!card) return;
    const cliente = clientes.find(c => c.id === card.dataset.id);
    if (cliente) abrirModal(cliente);
});

/* ----------  GUARDAR (crear o editar)  ---------- */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = campos.id.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    const base = {
        nombre:      campos.nombre.value.trim(),
        universidad: campos.universidad.value.trim(),
        carrera:     campos.carrera.value.trim(),
        nivel:       campos.nivel.value,
        avance_tesis: parseInt(campos.tesis.value, 10),
        avance_pagos: parseInt(campos.pagos.value, 10),
    };

    if (!base.nombre || !base.universidad || !base.carrera) {
        mostrarToast('Completa nombre, universidad y carrera.');
        return;
    }

    submitBtn.disabled = true; submitBtn.textContent = 'Guardando...';

    if (id) {
        // EDITAR
        const { error } = await sb.from('clientes').update(base).eq('id', id);
        submitBtn.disabled = false; submitBtn.textContent = 'Guardar';
        if (error) { mostrarToast('Error al actualizar.'); return; }
        await cargarClientes();
        cerrarModal();
        mostrarToast('Cliente actualizado.');
    } else {
        // CREAR
        const usuario = campos.usuario.value.trim().toLowerCase();
        const clave   = campos.clave.value.trim();
        if (!usuario || !clave) {
            submitBtn.disabled = false; submitBtn.textContent = 'Guardar';
            mostrarToast('Asigna usuario y clave.'); return;
        }
        if (clave.length < 6) {
            submitBtn.disabled = false; submitBtn.textContent = 'Guardar';
            mostrarToast('La clave debe tener al menos 6 caracteres.'); return;
        }
        if (clientes.some(c => (c.usuario || '').toLowerCase() === usuario)) {
            submitBtn.disabled = false; submitBtn.textContent = 'Guardar';
            mostrarToast('Ese usuario ya existe. Elige otro.'); return;
        }

        // 1) Crear el acceso (auth user) con un cliente temporal
        const temp = makeTempClient();
        const { data: signUpData, error: signErr } = await temp.auth.signUp({
            email: usuarioAEmail(usuario),
            password: clave
        });
        if (signErr || !signUpData.user) {
            submitBtn.disabled = false; submitBtn.textContent = 'Guardar';
            mostrarToast('No se pudo crear el acceso: ' + (signErr ? signErr.message : 'intenta con otro usuario.'));
            return;
        }

        // 2) Crear el registro del cliente (como admin)
        const { error: insErr } = await sb.from('clientes').insert({
            user_id: signUpData.user.id,
            usuario: usuario,
            ...base
        });
        submitBtn.disabled = false; submitBtn.textContent = 'Guardar';
        if (insErr) { mostrarToast('Se creó el acceso pero falló el registro: ' + insErr.message); return; }

        await cargarClientes();
        cerrarModal();
        mostrarToast('Cliente creado. Usuario: ' + usuario);
    }
});

/* ----------  ELIMINAR  ---------- */
btnEliminar.addEventListener('click', async () => {
    const id = campos.id.value;
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Se borrará su información y su bitácora. Esta acción no se puede deshacer.`)) return;

    const { error } = await sb.from('clientes').delete().eq('id', id);
    if (error) { mostrarToast('Error al eliminar.'); return; }
    await cargarClientes();
    cerrarModal();
    mostrarToast('Cliente eliminado.');
});

/* ============================================================
   SOLICITUDES DE CITA
   ============================================================ */
let citasCache = [];

function fechaHoraCorta(iso) {
    return new Date(iso).toLocaleString('es-EC', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}
function isoToLocalInput(iso) {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

async function cargarCitasPendientes() {
    const { data, error } = await sb.from('citas')
        .select('*, clientes(nombre, universidad, carrera)')
        .eq('estado', 'pendiente')
        .order('fecha_propuesta', { ascending: true });

    if (error) { console.error('Error citas:', error); citasAdmin.hidden = true; return; }

    citasCache = data || [];
    if (citasCache.length === 0) { citasAdmin.hidden = true; return; }

    citasAdmin.hidden = false;
    citasCount.textContent = citasCache.length;
    citasAdminLista.innerHTML = citasCache.map(c => {
        const cli = c.clientes || {};
        return `
        <div class="cita-admin-item" data-id="${c.id}">
            <div>
                <div class="cita-admin-cliente">${escapeHtml(cli.nombre || 'Cliente')}</div>
                <div class="cita-admin-meta">${escapeHtml([cli.universidad, cli.carrera].filter(Boolean).join(' · '))}</div>
                <div class="cita-admin-tema">${escapeHtml(c.tema)}</div>
            </div>
            <div class="cita-admin-fecha">${escapeHtml(fechaHoraCorta(c.fecha_propuesta))}</div>
        </div>`;
    }).join('');
}

function abrirGestion(cita) {
    const cli = cita.clientes || {};
    gestionId.value = cita.id;
    gestionInfo.innerHTML =
        `<strong>${escapeHtml(cli.nombre || 'Cliente')}</strong>` +
        `<div class="linea">Fecha propuesta: ${escapeHtml(fechaHoraCorta(cita.fecha_propuesta))}</div>` +
        `<div class="linea">Tema: ${escapeHtml(cita.tema)}</div>`;
    gestionFecha.value = isoToLocalInput(cita.fecha_propuesta);
    gestionNota.value = '';
    gestionOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
}
function cerrarGestion() {
    gestionOverlay.hidden = true;
    document.body.style.overflow = '';
}

citasAdminLista.addEventListener('click', (e) => {
    const item = e.target.closest('.cita-admin-item');
    if (!item) return;
    const cita = citasCache.find(c => c.id === item.dataset.id);
    if (cita) abrirGestion(cita);
});

document.getElementById('gestionCitaClose').addEventListener('click', cerrarGestion);
document.getElementById('btnCerrarGestion').addEventListener('click', cerrarGestion);
gestionOverlay.addEventListener('click', (e) => { if (e.target === gestionOverlay) cerrarGestion(); });

document.getElementById('btnConfirmarCita').addEventListener('click', async () => {
    const id = gestionId.value;
    const fechaVal = gestionFecha.value;
    if (!fechaVal) { mostrarToast('Elige la fecha y hora confirmada.'); return; }
    const fechaISO = new Date(fechaVal).toISOString();
    const { error } = await sb.from('citas').update({
        estado: 'confirmada',
        fecha_confirmada: fechaISO,
        nota_admin: gestionNota.value.trim() || null
    }).eq('id', id);
    if (error) { mostrarToast('Error al confirmar la cita.'); return; }
    cerrarGestion();
    await cargarCitasPendientes();
    mostrarToast('Cita confirmada.');
});

document.getElementById('btnRechazarCita').addEventListener('click', async () => {
    const id = gestionId.value;
    if (!confirm('¿Rechazar esta solicitud de cita?')) return;
    const { error } = await sb.from('citas').update({
        estado: 'rechazada',
        nota_admin: gestionNota.value.trim() || null
    }).eq('id', id);
    if (error) { mostrarToast('Error al rechazar.'); return; }
    cerrarGestion();
    await cargarCitasPendientes();
    mostrarToast('Solicitud rechazada.');
});

/* ----------  INICIO  ---------- */
initAuth();
