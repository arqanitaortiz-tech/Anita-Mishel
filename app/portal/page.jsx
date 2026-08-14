'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSb } from '@/lib/supabase';
import { Marca, Modal, useToast, Avance, Badge, Cargando } from '@/components/Ui';

const BUCKET = 'documentos';

function fechaLarga(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fechaHora(iso) {
  return new Date(iso).toLocaleString('es-EC', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
const slug = (n) => (n || 'archivo').toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/^-+|-+$/g, '');

export default function Portal() {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [userId, setUserId] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [sinPerfil, setSinPerfil] = useState(false);
  const [citas, setCitas] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [modalOnboard, setModalOnboard] = useState(false);
  const [modalCita, setModalCita] = useState(false);
  const [modalNota, setModalNota] = useState(null); // id de entrada
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (cid) => {
    const sb = getSb();
    const [c, b, n] = await Promise.all([
      sb.from('citas').select('*').eq('cliente_id', cid).order('creado', { ascending: false }),
      sb.from('bitacora').select('*').eq('cliente_id', cid).order('fecha', { ascending: true }),
      sb.from('notas_cliente').select('*').eq('cliente_id', cid).order('creado', { ascending: true }),
    ]);
    setCitas(c.data || []);
    setEntradas(b.data || []);
    setNotas(n.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const sb = getSb();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      setUserId(session.user.id);
      const { data } = await sb.from('clientes').select('*').eq('user_id', session.user.id).limit(1);
      if (!data || data.length === 0) { setSinPerfil(true); return; }
      const cli = data[0];
      setCliente(cli);
      await cargar(cli.id);
      const { data: ob } = await sb.from('onboarding').select('id').eq('cliente_id', cli.id).limit(1);
      if (!ob || ob.length === 0) setModalOnboard(true);
    })();
  }, [router, cargar]);

  async function salir() {
    await getSb().auth.signOut();
    router.replace('/login');
  }

  /* ---------- onboarding ---------- */
  async function guardarOnboarding(e) {
    e.preventDefault();
    const f = e.target;
    const pdf = f.pdf.files[0];
    if (!pdf) { showToast('Sube el PDF de tu cédula.'); return; }
    setGuardando(true);
    const sb = getSb();
    const path = `${userId}/cedula-${Date.now()}.pdf`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, pdf);
    if (upErr) { setGuardando(false); showToast('Error al subir el PDF.'); return; }
    const { error } = await sb.from('onboarding').insert({
      cliente_id: cliente.id,
      nombres: f.nombres.value.trim(),
      cedula_ruc: f.cedula.value.trim(),
      universidad: f.universidad.value.trim(),
      pdf_cedula_path: path,
      terminos_aceptados: true,
      fecha_aceptacion: new Date().toISOString(),
    });
    setGuardando(false);
    if (error) { showToast('Error al guardar tus datos.'); return; }
    setModalOnboard(false);
    showToast('¡Datos registrados! Bienvenido/a.');
  }

  /* ---------- citas ---------- */
  async function solicitarCita(e) {
    e.preventDefault();
    const f = e.target;
    const fechaVal = f.fecha.value;
    const tema = f.tema.value.trim();
    const elegido = new Date(fechaVal);
    if (elegido < new Date()) { showToast('Elige una fecha futura.'); return; }

    const diaStr = `${elegido.getFullYear()}-${String(elegido.getMonth() + 1).padStart(2, '0')}-${String(elegido.getDate()).padStart(2, '0')}`;
    const horaStr = `${String(elegido.getHours()).padStart(2, '0')}:${String(elegido.getMinutes()).padStart(2, '0')}`;
    const sb = getSb();
    const { data: bloqs } = await sb.from('bloqueos').select('*').eq('fecha', diaStr);
    if (bloqs && bloqs.length) {
      const cerrado = bloqs.some((b) => b.todo_el_dia) ||
        bloqs.some((b) => !b.todo_el_dia && b.hora_inicio && b.hora_fin &&
          horaStr >= b.hora_inicio.slice(0, 5) && horaStr < b.hora_fin.slice(0, 5));
      if (cerrado) { showToast('Ese día u horario no está disponible. Elige otro.'); return; }
    }
    setGuardando(true);
    const { error } = await sb.from('citas').insert({
      cliente_id: cliente.id, fecha_propuesta: elegido.toISOString(), tema, estado: 'pendiente',
    });
    setGuardando(false);
    if (error) { showToast('Error al enviar la solicitud.'); return; }
    await cargar(cliente.id);
    setModalCita(false);
    showToast('Solicitud enviada. Tu asesora la confirmará.');
  }

  async function cancelarCita(id) {
    if (!confirm('¿Cancelar esta solicitud de cita?')) return;
    const { error } = await getSb().from('citas').delete().eq('id', id);
    if (error) { showToast('Error al cancelar.'); return; }
    await cargar(cliente.id);
    showToast('Solicitud cancelada.');
  }

  /* ---------- notas ---------- */
  async function guardarNota(e) {
    e.preventDefault();
    const f = e.target;
    const texto = f.texto.value.trim();
    const doc = f.doc.files[0];
    if (!texto && !doc) { showToast('Escribe una nota o adjunta un documento.'); return; }
    setGuardando(true);
    const sb = getSb();
    let documentoPath = null;
    if (doc) {
      documentoPath = `${userId}/doc-${Date.now()}-${slug(doc.name)}`;
      const { error: upErr } = await sb.storage.from(BUCKET).upload(documentoPath, doc);
      if (upErr) { setGuardando(false); showToast('Error al subir el documento.'); return; }
    }
    const { error } = await sb.from('notas_cliente').insert({
      bitacora_id: modalNota, cliente_id: cliente.id, texto: texto || null, documento_path: documentoPath,
    });
    setGuardando(false);
    if (error) { showToast('Error al guardar la nota.'); return; }
    await cargar(cliente.id);
    setModalNota(null);
    showToast('Nota guardada.');
  }

  async function abrirDoc(path) {
    const { data, error } = await getSb().storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) { showToast('No se pudo abrir el documento.'); return; }
    window.open(data.signedUrl, '_blank');
  }

  /* ---------- render ---------- */
  if (sinPerfil)
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center text-piedra">
        <div>
          <p>Esta cuenta no tiene un perfil de cliente.</p>
          <button onClick={salir} className="btn-ghost mt-4">Salir</button>
        </div>
      </main>
    );
  if (!cliente) return <Cargando />;

  const notasPorEntrada = {};
  notas.forEach((n) => { (notasPorEntrada[n.bitacora_id] = notasPorEntrada[n.bitacora_id] || []).push(n); });
  const primerNombre = (cliente.nombre || '').split(/\s+/)[0];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-linea bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Marca size={28} />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-piedra sm:block">Hola, {primerNombre}</span>
            <button onClick={salir} className="btn-ghost !px-4 !py-1.5 text-xs">Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{cliente.nombre}</h1>
        <p className="mt-1 text-sm text-piedra">
          {[cliente.universidad, cliente.carrera].filter(Boolean).join(' · ')}
        </p>

        {/* Avances */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card p-5"><Avance label="Elaboración de tesis" value={cliente.avance_tesis || 0} /></div>
          <div className="card p-5"><Avance label="Pagos" value={cliente.avance_pagos || 0} olive={false} /></div>
        </div>

        {/* Citas */}
        <div className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Mis citas</h2>
            <button onClick={() => setModalCita(true)} className="btn-olivo !py-2 text-xs">Solicitar cita</button>
          </div>
          {citas.length === 0 ? (
            <div className="card border-dashed p-8 text-center text-sm text-piedra">
              No tienes citas todavía. Solicita una cuando quieras revisar tu proyecto.
            </div>
          ) : (
            <div className="space-y-3">
              {citas.map((c) => {
                const fecha = c.estado === 'confirmada' && c.fecha_confirmada ? c.fecha_confirmada : c.fecha_propuesta;
                return (
                  <div key={c.id} className="card flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{fechaHora(fecha)}</p>
                      <p className="mt-0.5 text-sm text-piedra">{c.tema}</p>
                      {c.nota_admin && (
                        <p className="mt-2 border-t border-dashed border-linea pt-2 text-xs text-piedra">
                          <span className="font-semibold uppercase tracking-wide text-olivo-prof">Nota de tu asesora: </span>
                          {c.nota_admin}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge estado={c.estado} />
                      {c.estado === 'pendiente' && (
                        <button onClick={() => cancelarCita(c.id)} className="text-xs text-piedra underline hover:text-red-700">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bitácora */}
        <div className="mt-12">
          <h2 className="mb-5 font-display text-xl font-semibold">Bitácora de avance</h2>
          {entradas.length === 0 ? (
            <div className="card border-dashed p-8 text-center text-sm text-piedra">
              Cuando tu asesora registre avances, aparecerán aquí.
            </div>
          ) : (
            <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-linea">
              {entradas.map((e) => (
                <div key={e.id} className="relative pl-8">
                  <span className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-[3px] border-papel bg-olivo shadow-[0_0_0_1px_#DDE3D6]" />
                  <div className="card p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-olivo-prof">{fechaLarga(e.fecha)}</p>
                    <p className="mt-1 text-sm font-semibold">{e.actividad}</p>
                    {e.notas_asesor && (
                      <p className="mt-1.5 text-sm text-piedra">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-piedra/70">Notas de tu asesora</span>
                        {e.notas_asesor}
                      </p>
                    )}
                    {(notasPorEntrada[e.id] || []).length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-dashed border-linea pt-3">
                        {notasPorEntrada[e.id].map((n) => (
                          <div key={n.id} className="rounded-lg bg-salvia/60 px-3 py-2 text-sm">
                            {n.texto}
                            {n.documento_path && (
                              <button onClick={() => abrirDoc(n.documento_path)}
                                className="mt-1 block text-xs font-medium text-olivo-prof underline">
                                Ver documento
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setModalNota(e.id)}
                      className="mt-3 rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-olivo-prof transition hover:border-olivo">
                      + Agregar nota o documento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL ONBOARDING */}
      <Modal open={modalOnboard} title="Bienvenido/a · Completa tus datos">
        <p className="mb-5 text-sm text-piedra">
          Antes de comenzar, necesitamos algunos datos para tu registro y contrato de asesoría.
        </p>
        <form onSubmit={guardarOnboarding}>
          <div className="mb-4">
            <label className="lbl">Nombres completos</label>
            <input name="nombres" className="field" required placeholder="Como aparece en tu cédula" />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lbl">Cédula o RUC</label>
              <input name="cedula" className="field" required placeholder="Ej. 1712345678" />
            </div>
            <div>
              <label className="lbl">Universidad</label>
              <input name="universidad" className="field" required placeholder="Tu universidad" />
            </div>
          </div>
          <div className="mb-4">
            <label className="lbl">PDF de la cédula</label>
            <input name="pdf" type="file" accept="application/pdf" required className="text-sm text-piedra" />
          </div>
          <label className="mb-5 flex items-start gap-2.5 text-sm">
            <input type="checkbox" required className="mt-1" />
            <span>
              He leído y acepto los{' '}
              <button type="button" className="font-medium text-olivo underline"
                onClick={() => alert('Términos y condiciones (texto pendiente de definir).')}>
                términos y condiciones
              </button>{' '}
              del servicio de asesoría.
            </span>
          </label>
          <button className="btn-olivo w-full" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Aceptar y continuar'}
          </button>
        </form>
      </Modal>

      {/* MODAL SOLICITAR CITA */}
      <Modal open={modalCita} onClose={() => setModalCita(false)} title="Solicitar cita">
        <p className="mb-5 text-sm text-piedra">Propón una fecha y hora; tu asesora la confirmará o te sugerirá otra.</p>
        <form onSubmit={solicitarCita}>
          <div className="mb-4">
            <label className="lbl">Fecha y hora tentativa</label>
            <input name="fecha" type="datetime-local" required className="field" />
          </div>
          <div className="mb-5">
            <label className="lbl">¿Qué quieres discutir?</label>
            <textarea name="tema" rows={3} required className="field"
              placeholder="Ej. Revisar el avance del capítulo 3 y dudas de metodología" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalCita(false)} className="btn-ghost">Cancelar</button>
            <button className="btn-olivo" disabled={guardando}>{guardando ? 'Enviando...' : 'Enviar solicitud'}</button>
          </div>
        </form>
      </Modal>

      {/* MODAL NOTA */}
      <Modal open={!!modalNota} onClose={() => setModalNota(null)} title="Agregar nota o documento">
        <form onSubmit={guardarNota}>
          <div className="mb-4">
            <label className="lbl">Tu nota</label>
            <textarea name="texto" rows={4} className="field" placeholder="Escribe un comentario o duda para tu asesora..." />
          </div>
          <div className="mb-5">
            <label className="lbl">Documento (opcional)</label>
            <input name="doc" type="file" className="text-sm text-piedra" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalNota(null)} className="btn-ghost">Cancelar</button>
            <button className="btn-olivo" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {toast}
    </main>
  );
}
