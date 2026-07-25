/* ============================================================
   DASHBOARD DEL CLIENTE — Anita Mishel
   ------------------------------------------------------------
   TEMPORAL: lee y escribe en localStorage (mismos datos que el
   panel de admin). Sesión en sessionStorage. Sin backend, no es
   seguro y el PDF de cédula / documentos NO se almacenan de
   verdad (solo el nombre). Se reemplaza al conectar la BD.
   ============================================================ */

const STORAGE_KEY = 'anita_clientes';
const SESSION_KEY = 'anita_sesion';

/* ----------  DATOS  ---------- */
function cargarClientes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
}
function guardarClientes(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

// Sesión
const sesionId = sessionStorage.getItem(SESSION_KEY);
if (!sesionId) { window.location.href = 'login.html'; }

let clientes = cargarClientes();
let cliente  = clientes.find(c => c.id === sesionId);
if (!cliente) { sessionStorage.removeItem(SESSION_KEY); window.location.href = 'login.html'; }

/* ----------  REFERENCIAS  ---------- */
const toast = document.getElementById('toast');

/* ----------  UTILIDADES  ---------- */
function persistir() {
    const idx = clientes.findIndex(c => c.id === cliente.id);
    clientes[idx] = cliente;
    guardarClientes(clientes);
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function fechaLarga(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

/* ----------  PINTAR ENCABEZADO Y BARRAS  ---------- */
function pintarInfo() {
    const primerNombre = (cliente.nombre || '').split(/\s+/)[0];
    document.getElementById('cliHola').textContent = primerNombre ? `Hola, ${primerNombre}` : '';
    document.getElementById('cliNombre').textContent = cliente.nombre || 'Mi avance';
    document.getElementById('cliPrograma').textContent =
        [cliente.universidad, cliente.carrera].filter(Boolean).join(' · ');

    const t = cliente.tesis || 0;
    const p = cliente.pagos || 0;
    document.getElementById('pctTesis').textContent = t + '%';
    document.getElementById('pctPagos').textContent = p + '%';
    document.getElementById('fillTesis').style.width = t + '%';
    document.getElementById('fillPagos').style.width = p + '%';
}

/* ----------  PINTAR BITÁCORA  ---------- */
function pintarBitacora() {
    const timeline = document.getElementById('timeline');
    const empty = document.getElementById('bitacoraEmpty');
    const entradas = cliente.bitacora || [];

    if (entradas.length === 0) {
        timeline.innerHTML = '';
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    // Orden cronológico: la primera arriba, las nuevas debajo
    const orden = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

    timeline.innerHTML = orden.map(e => {
        const notasCliente = (e.notasCliente || []).map(n => `
            <div class="tl-nota-item">
                ${n.texto ? escapeHtml(n.texto) : ''}
                ${n.doc ? `<div class="tl-nota-doc">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    ${escapeHtml(n.doc)}
                </div>` : ''}
            </div>
        `).join('');

        return `
        <div class="tl-entry">
            <span class="tl-dot"></span>
            <div class="tl-card">
                <div class="tl-fecha">${escapeHtml(fechaLarga(e.fecha))}</div>
                <div class="tl-actividad">${escapeHtml(e.actividad)}</div>
                ${e.notasAsesor ? `<div class="tl-notas-asesor"><span class="etq">Notas de tu asesora</span>${escapeHtml(e.notasAsesor)}</div>` : ''}
                ${notasCliente ? `<div class="tl-cliente-notas">${notasCliente}</div>` : ''}
                <button class="tl-add-btn" data-entrada="${e.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Agregar nota o documento
                </button>
            </div>
        </div>`;
    }).join('');
}

/* ----------  ONBOARDING (PRIMER INGRESO)  ---------- */
const onboardOverlay = document.getElementById('onboardOverlay');
const onboardForm = document.getElementById('onboardForm');

function revisarOnboarding() {
    if (!cliente.onboarding) {
        onboardOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }
}

onboardForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pdf = document.getElementById('obPdf').files[0];
    cliente.onboarding = {
        nombres: document.getElementById('obNombres').value.trim(),
        cedula: document.getElementById('obCedula').value.trim(),
        universidad: document.getElementById('obUniversidad').value.trim(),
        pdfNombre: pdf ? pdf.name : '',        // solo el nombre por ahora
        terminosAceptados: true,
        fechaAceptacion: new Date().toISOString()
    };
    persistir();
    onboardOverlay.hidden = true;
    document.body.style.overflow = '';
    mostrarToast('¡Datos registrados! Bienvenido/a.');
});

document.getElementById('verTerminos').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Términos y condiciones (texto pendiente de definir). Aquí irá el contrato de asesoría que proporcionará Anita.');
});

/* ----------  MODAL NOTA DEL CLIENTE  ---------- */
const notaOverlay = document.getElementById('notaOverlay');
const notaForm = document.getElementById('notaForm');

function abrirNota(entradaId) {
    notaForm.reset();
    document.getElementById('notaEntradaId').value = entradaId;
    notaOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
}
function cerrarNota() {
    notaOverlay.hidden = true;
    document.body.style.overflow = '';
}

document.getElementById('notaClose').addEventListener('click', cerrarNota);
document.getElementById('notaCancelar').addEventListener('click', cerrarNota);
notaOverlay.addEventListener('click', (e) => { if (e.target === notaOverlay) cerrarNota(); });

document.getElementById('timeline').addEventListener('click', (e) => {
    const btn = e.target.closest('.tl-add-btn');
    if (btn) abrirNota(btn.dataset.entrada);
});

notaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entradaId = document.getElementById('notaEntradaId').value;
    const texto = document.getElementById('notaTexto').value.trim();
    const doc = document.getElementById('notaDoc').files[0];

    if (!texto && !doc) { mostrarToast('Escribe una nota o adjunta un documento.'); return; }

    const entrada = (cliente.bitacora || []).find(x => x.id === entradaId);
    if (!entrada) return;
    if (!entrada.notasCliente) entrada.notasCliente = [];
    entrada.notasCliente.push({
        texto: texto,
        doc: doc ? doc.name : '',   // solo el nombre por ahora
        fecha: new Date().toISOString()
    });
    persistir();
    pintarBitacora();
    cerrarNota();
    mostrarToast('Nota guardada.');
});

/* ----------  SALIR  ---------- */
document.getElementById('btnSalir').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
});

/* ----------  INICIO  ---------- */
pintarInfo();
pintarBitacora();
revisarOnboarding();
