'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSb } from '@/lib/supabase';
import { clausulas, numeroContrato } from '@/lib/contrato';
import { Marca, Modal, useToast, Avance, Badge, Cargando } from '@/components/Ui';
import FirmaPad from '@/components/FirmaPad';

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
function fCorta(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
const slug = (n) => (n || 'archivo').toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/^-+|-+$/g, '');
const usd = (n) => 'USD $' + Number(n || 0).toFixed(2);

export default function Portal() {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [userId, setUserId] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [sinPerfil, setSinPerfil] = useState(false);
  const [citas, setCitas] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [contrato, setContrato] = useState(null);
  const [necesitaOnboarding, setNecesitaOnboarding] = useState(false);
  const [modalCita, setModalCita] = useState(false);
  const [modalNota, setModalNota] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (cid) => {
    const sb = getSb();
    const [c, b, n, a, co] = await Promise.all([
      sb.from('citas').select('*').eq('cliente_id', cid).order('creado', { ascending: false }),
      sb.from('bitacora').select('*').eq('cliente_id', cid).order('fecha', { ascending: true }),
      sb.from('notas_cliente').select('*').eq('cliente_id', cid).order('creado', { ascending: true }),
      sb.from('abonos').select('*').eq('cliente_id', cid).order('fecha', { ascending: true }),
      sb.from('contratos').select('*').eq('cliente_id', cid).limit(1),
    ]);
    setCitas(c.data || []);
    setEntradas(b.data || []);
    setNotas(n.data || []);
    setAbonos(a.data || []);
    setContrato(co.data?.[0] || null);
    return co.data?.[0] || null;
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
      const contratoExistente = await cargar(cli.id);
      // Onboarding con contrato solo para clientes digitales sin contrato aún
      if (!contratoExistente && cli.contrato_tipo !== 'fisico') setNecesitaOnboarding(true);
    })();
  }, [router, cargar]);

  async function salir() {
    await getSb().auth.signOut();
    router.replace('/login');
  }

  /* ---------- citas ---------- */
  async function solicitarCita(e) {
    e.preventDefault();
    const f = e.target;
    const diaStr = f.fecha.value;
    const hora = Number(f.hora.value);
    const tema = f.tema.value.trim();
    if (!diaStr || !hora) { showToast('Elige día y hora.'); return; }

    const elegido = new Date(`${diaStr}T${String(hora).padStart(2, '0')}:00:00`);
    if (elegido < new Date()) { showToast('Elige una fecha futura.'); return; }
    if (hora < 8 || hora >= 23) { alert('Ese horario no está disponible. La atención es de 08:00 a 23:00.'); return; }

    const sb = getSb();
    const { data: bloqs } = await sb.from('bloqueos').select('*').eq('fecha', diaStr);
    if (bloqs && bloqs.length) {
      const cerrado = bloqs.some((b) => b.todo_el_dia) ||
        bloqs.some((b) => !b.todo_el_dia && b.hora_inicio && b.hora_fin &&
          hora >= parseInt(b.hora_inicio.slice(0, 2), 10) && hora < parseInt(b.hora_fin.slice(0, 2), 10));
      if (cerrado) { alert('Ese horario no está disponible. Por favor elige otro.'); return; }
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

  const montoTotal = Number(cliente.monto_total || 0);
  const anticipo = Number(cliente.anticipo || 0);
  const totalAbonado = anticipo + abonos.reduce((s, a) => s + Number(a.monto), 0);
  const pctPagos = montoTotal > 0 ? Math.min(100, Math.round((totalAbonado / montoTotal) * 100)) : 0;

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

        {/* Avance de tesis + contrato */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card p-5"><Avance label="Elaboración de tesis" value={cliente.avance_tesis || 0} /></div>
          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="text-[13px] font-medium">Contrato</p>
              <p className="mt-1 text-xs text-piedra">
                {contrato
                  ? (contrato.tipo === 'fisico' ? 'Firmado en físico' : `No. ${numeroContrato(contrato.num, contrato.anio)} · firmado`)
                  : cliente.contrato_tipo === 'fisico' ? 'Firmado en físico' : 'Pendiente de firma'}
              </p>
            </div>
            {contrato?.pdf_path && (
              <button onClick={() => abrirDoc(contrato.pdf_path)} className="btn-ghost !px-4 !py-1.5 text-xs">Ver PDF</button>
            )}
          </div>
        </div>

        {/* Pagos */}
        <div className="card mt-4 p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13px] font-medium">Pagos</p>
            {montoTotal > 0 ? (
              <p className="text-xs text-piedra">
                Abonado <b className="text-tinta">{usd(totalAbonado)}</b> de {usd(montoTotal)} · Saldo{' '}
                <b className="text-tinta">{usd(Math.max(0, montoTotal - totalAbonado))}</b>
              </p>
            ) : (
              <p className="text-xs text-piedra">Monto por definir con tu asesora</p>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-salvia">
            <div className="h-1.5 rounded-full bg-olivo-neg transition-all duration-500" style={{ width: `${pctPagos}%` }} />
          </div>
          {(anticipo > 0 || abonos.length > 0) && (
            <div className="mt-4 space-y-1.5 border-t border-dashed border-linea pt-3">
              {anticipo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-piedra">Anticipo (a la firma del contrato)</span>
                  <span className="font-semibold">{usd(anticipo)}</span>
                </div>
              )}
              {abonos.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-piedra">{fCorta(a.fecha)}{a.nota ? ` · ${a.nota}` : ''}</span>
                  <span className="font-semibold">{usd(a.monto)}</span>
                </div>
              ))}
            </div>
          )}
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

      {/* ONBOARDING + CONTRATO */}
      {necesitaOnboarding && (
        <OnboardingContrato
          cliente={cliente}
          userId={userId}
          onDone={async () => {
            setNecesitaOnboarding(false);
            await cargar(cliente.id);
            showToast('¡Contrato firmado! Revisa tu correo. Bienvenido/a.');
          }}
          showToast={showToast}
        />
      )}

      {/* MODAL SOLICITAR CITA */}
      <Modal open={modalCita} onClose={() => setModalCita(false)} title="Solicitar cita">
        <p className="mb-5 text-sm text-piedra">Propón una fecha y hora; tu asesora la confirmará o te sugerirá otra.</p>
        <form onSubmit={solicitarCita}>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lbl">Día</label>
              <input name="fecha" type="date" required className="field" />
            </div>
            <div>
              <label className="lbl">Hora (1 hora)</label>
              <select name="hora" required className="field" defaultValue="">
                <option value="" disabled>Elige...</option>
                {Array.from({ length: 15 }).map((_, i) => {
                  const h = i + 8;
                  return <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>;
                })}
              </select>
            </div>
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

/* ============================================================
   ONBOARDING EN 3 PASOS: datos → contrato → firma
   ============================================================ */
function OnboardingContrato({ cliente, userId, onDone, showToast }) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState({ nombres: '', cedula: '', universidad: cliente.universidad || '', correo: '', telefono: '', genero: 'F' });
  const [pdfCedula, setPdfCedula] = useState(null);
  const [firma, setFirma] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const montoOk = Number(cliente.monto_total || 0) > 0;

  function pasoDatos(e) {
    e.preventDefault();
    const f = e.target;
    const d = {
      nombres: f.nombres.value.trim(),
      cedula: f.cedula.value.trim(),
      universidad: f.universidad.value.trim(),
      correo: f.correo.value.trim(),
      telefono: f.telefono.value.trim(),
      genero: f.genero.value,
    };
    const pdf = f.pdf.files[0];
    if (!pdf) { showToast('Sube el PDF de tu cédula.'); return; }
    setDatos(d);
    setPdfCedula(pdf);
    setPaso(2);
  }

  async function firmarYEnviar() {
    if (!firma) { showToast('Dibuja tu firma para continuar.'); return; }
    if (!acepta) { showToast('Debes aceptar el contrato.'); return; }
    setEnviando(true);
    const sb = getSb();
    try {
      // 1. Subir PDF de cédula
      const cedulaPath = `${userId}/cedula-${Date.now()}.pdf`;
      const { error: upErr } = await sb.storage.from(BUCKET).upload(cedulaPath, pdfCedula);
      if (upErr) throw new Error('No se pudo subir el PDF de la cédula.');

      // 2. Generar contrato en el servidor
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/contrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...datos, pdfCedulaPath: cedulaPath, firmaB64: firma }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Error al generar el contrato.');
      onDone();
    } catch (err) {
      showToast(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const clausulasVista = montoOk ? clausulas({
    nombreCliente: datos.nombres || '—',
    cedulaCliente: datos.cedula || '—',
    telefonoCliente: datos.telefono,
    genero: datos.genero,
    montoTotal: Number(cliente.monto_total),
    anticipo: Number(cliente.anticipo || 0),
    fechaFirma: new Date().toISOString(),
  }) : [];

  return (
    <Modal open title={paso === 1 ? 'Bienvenido/a · Completa tus datos' : paso === 2 ? 'Tu contrato de asesoría' : 'Firma tu contrato'} wide>
      {/* indicador de pasos */}
      <div className="mb-5 flex items-center gap-2">
        {[1, 2, 3].map((p) => (
          <span key={p} className={`h-1.5 flex-1 rounded-full ${p <= paso ? 'bg-olivo' : 'bg-salvia'}`} />
        ))}
      </div>

      {paso === 1 && (
        <form onSubmit={pasoDatos}>
          <p className="mb-5 text-sm text-piedra">
            Estos datos se usarán para generar tu contrato de asesoría. Revísalos con cuidado.
          </p>
          <div className="mb-4">
            <label className="lbl">Nombres completos (como en tu cédula)</label>
            <input name="nombres" defaultValue={datos.nombres} className="field" required />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lbl">Cédula o RUC</label>
              <input name="cedula" defaultValue={datos.cedula} className="field" required placeholder="Ej. 1712345678" />
            </div>
            <div>
              <label className="lbl">Teléfono celular</label>
              <input name="telefono" defaultValue={datos.telefono} className="field" required placeholder="Ej. 0991234567" />
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lbl">Correo electrónico</label>
              <input name="correo" type="email" defaultValue={datos.correo} className="field" required placeholder="tu@correo.com" />
              <p className="mt-1 text-[11px] text-piedra">Aquí recibirás tu contrato y las novedades de tu proceso.</p>
            </div>
            <div>
              <label className="lbl">Universidad</label>
              <input name="universidad" defaultValue={datos.universidad} className="field" required />
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lbl">Tratamiento en el contrato</label>
              <select name="genero" defaultValue={datos.genero} className="field">
                <option value="F">LA CONTRATANTE (femenino)</option>
                <option value="M">EL CONTRATANTE (masculino)</option>
              </select>
            </div>
            <div>
              <label className="lbl">PDF de tu cédula</label>
              <input name="pdf" type="file" accept="application/pdf" required className="pt-2 text-sm text-piedra" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn-olivo">Continuar</button>
          </div>
        </form>
      )}

      {paso === 2 && (
        <div>
          {!montoOk ? (
            <p className="rounded-lg bg-salvia/50 p-4 text-sm text-piedra">
              Tu asesora aún no ha registrado el monto de tu contrato. Escríbele para completarlo y vuelve a intentar.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-piedra">
                Lee tu contrato completo. Verifica que tus datos (en negrita al inicio) estén correctos — si hay un error,
                vuelve al paso anterior y corrígelo.
              </p>
              <div className="max-h-[380px] overflow-y-auto rounded-lg border border-linea bg-white p-5 text-[13px] leading-relaxed">
                <p className="mb-4 text-center font-semibold">CONTRATO CIVIL DE PRESTACIÓN DE SERVICIOS DE ASESORÍA ACADÉMICA</p>
                {clausulasVista.map(([t, c]) => (
                  <p key={t} className="mb-3 whitespace-pre-line">
                    <b>{t}</b> - {c}
                  </p>
                ))}
              </div>
            </>
          )}
          <div className="mt-5 flex justify-between">
            <button onClick={() => setPaso(1)} className="btn-ghost">← Corregir datos</button>
            {montoOk && <button onClick={() => setPaso(3)} className="btn-olivo">Estoy de acuerdo, continuar</button>}
          </div>
        </div>
      )}

      {paso === 3 && (
        <div>
          <p className="mb-4 text-sm text-piedra">
            Dibuja tu firma tal como firmas en papel. Quedará incorporada en el contrato junto a la de tu asesora.
          </p>
          <FirmaPad onChange={setFirma} />
          <label className="mt-5 flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-1" />
            <span>
              Declaro que he leído el contrato completo, que mis datos son correctos, y que al firmar
              <b> acepto sus términos y condiciones</b> con plenos efectos entre las partes.
            </span>
          </label>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setPaso(2)} className="btn-ghost" disabled={enviando}>← Volver al contrato</button>
            <button onClick={firmarYEnviar} className="btn-olivo" disabled={enviando}>
              {enviando ? 'Generando contrato...' : 'Firmar y aceptar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
