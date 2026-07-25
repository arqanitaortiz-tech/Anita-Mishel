/* ============================================================
   PANEL DE ADMINISTRACIÓN — Anita Mishel
   ------------------------------------------------------------
   ALMACENAMIENTO TEMPORAL: por ahora los clientes se guardan
   en el navegador (localStorage). Esto es solo para la demo.
   Cuando conectemos el backend, se reemplazan las funciones
   cargarClientes() y guardarClientes() por llamadas a la
   base de datos real. NO usar claves reales todavía.
   ============================================================ */

const STORAGE_KEY = 'anita_clientes';

/* ----------  DATOS  ---------- */
function cargarClientes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function guardarClientes(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

let clientes = cargarClientes();

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

/* ----------  UTILIDADES  ---------- */
function iniciales(nombre) {
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function generarClave() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function mostrarToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(mostrarToast._t);
    mostrarToast._t = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.hidden = true; }, 300);
    }, 2600);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

/* ----------  RENDER  ---------- */
function render(filtro = '') {
    const f = filtro.trim().toLowerCase();
    const lista = clientes.filter(c =>
        !f ||
        c.nombre.toLowerCase().includes(f) ||
        c.universidad.toLowerCase().includes(f) ||
        c.carrera.toLowerCase().includes(f)
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
                    <span class="avance-pct">${c.tesis}%</span>
                </div>
                <div class="avance-bar"><div class="avance-fill tesis" style="width:${c.tesis}%"></div></div>
            </div>
            <div class="avance-block">
                <div class="avance-top">
                    <span class="avance-label">Pagos</span>
                    <span class="avance-pct">${c.pagos}%</span>
                </div>
                <div class="avance-bar"><div class="avance-fill pagos" style="width:${c.pagos}%"></div></div>
            </div>
        </div>
    `).join('');
}

/* ----------  MODAL  ---------- */
function abrirModal(cliente = null) {
    form.reset();
    if (cliente) {
        modalTitle.textContent = 'Editar cliente';
        campos.id.value          = cliente.id;
        campos.nombre.value      = cliente.nombre;
        campos.universidad.value = cliente.universidad;
        campos.carrera.value     = cliente.carrera;
        campos.nivel.value       = cliente.nivel || 'Posgrado';
        campos.usuario.value     = cliente.usuario;
        campos.clave.value       = cliente.clave;
        campos.tesis.value       = cliente.tesis;
        campos.pagos.value       = cliente.pagos;
        btnEliminar.hidden = false;
        bitacoraAdmin.hidden = false;
        renderBitacora(cliente.id);
    } else {
        modalTitle.textContent = 'Nuevo cliente';
        campos.id.value = '';
        campos.tesis.value = 0;
        campos.pagos.value = 0;
        btnEliminar.hidden = true;
        bitacoraAdmin.hidden = true;   // la bitácora se habilita al guardar el cliente
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

/* ----------  BITÁCORA  ---------- */
function fechaCorta(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderBitacora(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    const entradas = (cliente && cliente.bitacora) ? [...cliente.bitacora] : [];
    entradas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

    if (entradas.length === 0) {
        bitacoraLista.innerHTML = '<p class="bitacora-vacia">Aún no hay entradas. Agrega la primera arriba.</p>';
        return;
    }

    bitacoraLista.innerHTML = entradas.map(e => {
        const numNotasCli = (e.notasCliente || []).length;
        return `
        <div class="bitacora-item">
            <div class="bitacora-item-head">
                <span class="bitacora-item-fecha">${escapeHtml(fechaCorta(e.fecha))}</span>
                <button type="button" class="bitacora-item-del" data-del="${e.id}" title="Eliminar entrada">✕</button>
            </div>
            <div class="bitacora-item-act">${escapeHtml(e.actividad)}</div>
            ${e.notasAsesor ? `<div class="bitacora-item-notas">${escapeHtml(e.notasAsesor)}</div>` : ''}
            ${numNotasCli ? `<div class="bitacora-item-cli">${numNotasCli} nota(s)/doc. del cliente</div>` : ''}
        </div>`;
    }).join('');
}

document.getElementById('btnAddBitacora').addEventListener('click', () => {
    const id = campos.id.value;
    if (!id) return;
    const fecha = bitFecha.value;
    const actividad = bitActividad.value.trim();
    const notas = bitNotas.value.trim();

    if (!fecha) { mostrarToast('Elige una fecha.'); return; }
    if (!actividad) { mostrarToast('Escribe la actividad realizada.'); return; }

    const idx = clientes.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (!clientes[idx].bitacora) clientes[idx].bitacora = [];
    clientes[idx].bitacora.push({
        id: nuevoId(),
        fecha: fecha,
        actividad: actividad,
        notasAsesor: notas,
        notasCliente: [],
        creado: Date.now()
    });
    guardarClientes(clientes);
    renderBitacora(id);
    bitFecha.value = '';
    bitActividad.value = '';
    bitNotas.value = '';
    mostrarToast('Entrada agregada.');
});

bitacoraLista.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const id = campos.id.value;
    const idx = clientes.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (confirm('¿Eliminar esta entrada de la bitácora?')) {
        clientes[idx].bitacora = (clientes[idx].bitacora || []).filter(x => x.id !== btn.dataset.del);
        guardarClientes(clientes);
        renderBitacora(id);
        mostrarToast('Entrada eliminada.');
    }
});

/* ----------  EVENTOS  ---------- */
document.getElementById('btnNuevo').addEventListener('click', () => abrirModal());
document.getElementById('btnNuevoVacio').addEventListener('click', () => abrirModal());
document.getElementById('modalClose').addEventListener('click', cerrarModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);

overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) cerrarModal(); });

campos.tesis.addEventListener('input', actualizarValores);
campos.pagos.addEventListener('input', actualizarValores);

document.getElementById('btnGenerar').addEventListener('click', () => {
    campos.clave.value = generarClave();
});

buscador.addEventListener('input', (e) => render(e.target.value));

// Clic en una tarjeta -> editar
grid.addEventListener('click', (e) => {
    const card = e.target.closest('.cliente-card');
    if (!card) return;
    const cliente = clientes.find(c => c.id === card.dataset.id);
    if (cliente) abrirModal(cliente);
});

// Guardar (crear o editar)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = {
        nombre:      campos.nombre.value.trim(),
        universidad: campos.universidad.value.trim(),
        carrera:     campos.carrera.value.trim(),
        nivel:       campos.nivel.value,
        usuario:     campos.usuario.value.trim(),
        clave:       campos.clave.value.trim(),
        tesis:       parseInt(campos.tesis.value, 10),
        pagos:       parseInt(campos.pagos.value, 10),
    };

    const id = campos.id.value;

    // Validar usuario único
    const usuarioDuplicado = clientes.some(c =>
        c.usuario.toLowerCase() === datos.usuario.toLowerCase() && c.id !== id
    );
    if (usuarioDuplicado) {
        mostrarToast('Ese usuario ya existe. Elige otro.');
        return;
    }

    if (id) {
        const idx = clientes.findIndex(c => c.id === id);
        clientes[idx] = { ...clientes[idx], ...datos };
        mostrarToast('Cliente actualizado.');
    } else {
        clientes.push({ id: nuevoId(), creado: Date.now(), ...datos });
        mostrarToast('Cliente creado.');
    }

    guardarClientes(clientes);
    render(buscador.value);
    cerrarModal();
});

// Eliminar
btnEliminar.addEventListener('click', () => {
    const id = campos.id.value;
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    if (confirm(`¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) {
        clientes = clientes.filter(c => c.id !== id);
        guardarClientes(clientes);
        render(buscador.value);
        cerrarModal();
        mostrarToast('Cliente eliminado.');
    }
});

/* ----------  INICIO  ---------- */
render();
