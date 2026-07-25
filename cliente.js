/* ============================================================
   DASHBOARD DEL CLIENTE — Anita Mishel (conectado a Supabase)
   ------------------------------------------------------------
   Lee los datos del cliente, su bitácora y sus notas desde
   Supabase. El PDF de cédula y los documentos se suben al
   almacenamiento privado. Cada cliente solo ve lo suyo (RLS).
   ============================================================ */

const toast = document.getElementById('toast');
const BUCKET = 'documentos';

let userId  = null;
let cliente = null;

/* ----------  UTILIDADES  ---------- */
function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => (
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
    }, 2800);
}
function slug(nombre) {
    return (nombre || 'archivo').toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ============================================================
   ARRANQUE: sesión + carga de datos
   ============================================================ */
async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }
    userId = session.user.id;

    // Cargar el registro del cliente (RLS: solo devuelve el suyo)
    const { data, error } = await sb.from('clientes').select('*').eq('user_id', userId).limit(1);
    if (error) { mostrarToast('Error al cargar tus datos.'); return; }

    if (!data || data.length === 0) {
        // La sesión no corresponde a un cliente (p. ej. es el admin)
        document.querySelector('.cli-container').innerHTML =
            '<div class="bitacora-empty" style="margin-top:40px;">Esta cuenta no tiene un perfil de cliente. Si eres administradora, entra por el panel de administración.</div>';
        return;
    }

    cliente = data[0];
    pintarInfo();
    await pintarBitacora();
    await revisarOnboarding();
}

/* ----------  ENCABEZADO Y BARRAS  ---------- */
function pintarInfo() {
    const primerNombre = (cliente.nombre || '').split(/\s+/)[0];
    document.getElementById('cliHola').textContent = primerNombre ? `Hola, ${primerNombre}` : '';
    document.getElementById('cliNombre').textContent = cliente.nombre || 'Mi avance';
    document.getElementById('cliPrograma').textContent =
        [cliente.universidad, cliente.carrera].filter(Boolean).join(' · ');

    const t = cliente.avance_tesis || 0;
    const p = cliente.avance_pagos || 0;
    document.getElementById('pctTesis').textContent = t + '%';
    document.getElementById('pctPagos').textContent = p + '%';
    document.getElementById('fillTesis').style.width = t + '%';
    document.getElementById('fillPagos').style.width = p + '%';
}

/* ----------  BITÁCORA  ---------- */
async function pintarBitacora() {
    const timeline = document.getElementById('timeline');
    const empty = document.getElementById('bitacoraEmpty');

    const [{ data: entradas, error }, { data: notas }] = await Promise.all([
        sb.from('bitacora').select('*').eq('cliente_id', cliente.id).order('fecha', { ascending: true }),
        sb.from('notas_cliente').select('*').eq('cliente_id', cliente.id).order('creado', { ascending: true })
    ]);

    if (error) { mostrarToast('Error al cargar la bitácora.'); return; }

    if (!entradas || entradas.length === 0) {
        timeline.innerHTML = '';
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    const notasPorEntrada = {};
    (notas || []).forEach(n => {
        (notasPorEntrada[n.bitacora_id] = notasPorEntrada[n.bitacora_id] || []).push(n);
    });

    timeline.innerHTML = entradas.map(e => {
        const mis = (notasPorEntrada[e.id] || []).map(n => `
            <div class="tl-nota-item">
                ${n.texto ? escapeHtml(n.texto) : ''}
                ${n.documento_path ? `<a class="tl-nota-doc" data-path="${escapeHtml(n.documento_path)}" href="#">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Ver documento
                </a>` : ''}
            </div>
        `).join('');

        return `
        <div class="tl-entry">
            <span class="tl-dot"></span>
            <div class="tl-card">
                <div class="tl-fecha">${escapeHtml(fechaLarga(e.fecha))}</div>
                <div class="tl-actividad">${escapeHtml(e.actividad)}</div>
                ${e.notas_asesor ? `<div class="tl-notas-asesor"><span class="etq">Notas de tu asesora</span>${escapeHtml(e.notas_asesor)}</div>` : ''}
                ${mis ? `<div class="tl-cliente-notas">${mis}</div>` : ''}
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

async function revisarOnboarding() {
    const { data } = await sb.from('onboarding').select('id').eq('cliente_id', cliente.id).limit(1);
    if (!data || data.length === 0) {
        onboardOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }
}

onboardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = onboardForm.querySelector('button[type="submit"]');
    const pdf = document.getElementById('obPdf').files[0];
    if (!pdf) { mostrarToast('Sube el PDF de tu cédula.'); return; }

    btn.disabled = true; btn.textContent = 'Guardando...';

    // Subir el PDF al almacenamiento privado
    const path = `${userId}/cedula-${Date.now()}.pdf`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, pdf, { upsert: false });
    if (upErr) {
        btn.disabled = false; btn.textContent = 'Aceptar y continuar';
        mostrarToast('Error al subir el PDF. Intenta de nuevo.');
        return;
    }

    // Guardar los datos del onboarding / contrato
    const { error: insErr } = await sb.from('onboarding').insert({
        cliente_id: cliente.id,
        nombres: document.getElementById('obNombres').value.trim(),
        cedula_ruc: document.getElementById('obCedula').value.trim(),
        universidad: document.getElementById('obUniversidad').value.trim(),
        pdf_cedula_path: path,
        terminos_aceptados: true,
        fecha_aceptacion: new Date().toISOString()
    });

    btn.disabled = false; btn.textContent = 'Aceptar y continuar';
    if (insErr) { mostrarToast('Error al guardar tus datos.'); return; }

    onboardOverlay.hidden = true;
    document.body.style.overflow = '';
    mostrarToast('¡Datos registrados! Bienvenido/a.');
});

document.getElementById('verTerminos').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Términos y condiciones (texto pendiente de definir). Aquí irá el contrato de asesoría.');
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

document.getElementById('timeline').addEventListener('click', async (e) => {
    const add = e.target.closest('.tl-add-btn');
    if (add) { abrirNota(add.dataset.entrada); return; }

    const doc = e.target.closest('.tl-nota-doc');
    if (doc) {
        e.preventDefault();
        const path = doc.dataset.path;
        const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60);
        if (error || !data) { mostrarToast('No se pudo abrir el documento.'); return; }
        window.open(data.signedUrl, '_blank');
    }
});

notaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = notaForm.querySelector('button[type="submit"]');
    const entradaId = document.getElementById('notaEntradaId').value;
    const texto = document.getElementById('notaTexto').value.trim();
    const docFile = document.getElementById('notaDoc').files[0];

    if (!texto && !docFile) { mostrarToast('Escribe una nota o adjunta un documento.'); return; }

    btn.disabled = true; btn.textContent = 'Guardando...';

    let documentoPath = null;
    if (docFile) {
        documentoPath = `${userId}/doc-${Date.now()}-${slug(docFile.name)}`;
        const { error: upErr } = await sb.storage.from(BUCKET).upload(documentoPath, docFile, { upsert: false });
        if (upErr) {
            btn.disabled = false; btn.textContent = 'Guardar';
            mostrarToast('Error al subir el documento.');
            return;
        }
    }

    const { error: insErr } = await sb.from('notas_cliente').insert({
        bitacora_id: entradaId,
        cliente_id: cliente.id,
        texto: texto || null,
        documento_path: documentoPath
    });

    btn.disabled = false; btn.textContent = 'Guardar';
    if (insErr) { mostrarToast('Error al guardar la nota.'); return; }

    await pintarBitacora();
    cerrarNota();
    mostrarToast('Nota guardada.');
});

/* ----------  SALIR  ---------- */
document.getElementById('btnSalir').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'login.html';
});

/* ----------  INICIO  ---------- */
init();
