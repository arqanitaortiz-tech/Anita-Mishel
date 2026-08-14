'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSb, makeTempClient, usuarioAEmail } from '@/lib/supabase';
import { Marca, Modal, useToast, Cargando } from '@/components/Ui';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const pad2 = (n) => String(n).padStart(2, '0');
const fechaAStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoADia = (iso) => fechaAStr(new Date(iso));
const isoAHora = (iso) => new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const citaISO = (c) => (c.estado === 'confirmada' && c.fecha_confirmada ? c.fecha_confirmada : c.fecha_propuesta);
const fhCorta = (iso) => new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fCorta = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
const iniciales = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map((p) => (p[0] || '').toUpperCase()).join('');
const genClave = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 8; i++) o += c[Math.floor(Math.random() * c.length)]; return o; };
const isoToLocal = (iso) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function Admin() {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [listo, setListo] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [pendientes, setPendientes] = useState([]);
  const [citasTodas, setCitasTodas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [diaSel, setDiaSel] = useState(null);
  const [modalCliente, setModalCliente] = useState(null); // null | {} nuevo | cliente
  const [modalGestion, setModalGestion] = useState(null); // cita pendiente
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /* ---------- carga ---------- */
  const cargarTodo = useCallback(async () => {
    const sb = getSb();
    const [cl, pe, ci, bl] = await Promise.all([
      sb.from('clientes').select('*').order('creado', { ascending: false }),
      sb.from('citas').select('*, clientes(nombre, universidad, carrera)').eq('estado', 'pendiente').order('fecha_propuesta'),
      sb.from('citas').select('*, clientes(nombre)').in('estado', ['pendiente', 'confirmada']),
      sb.from('bloqueos').select('*'),
    ]);
    setClientes(cl.data || []);
    setPendientes(pe.data || []);
    setCitasTodas(ci.data || []);
    setBloqueos(bl.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const sb = getSb();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      const { data: esAdmin } = await sb.rpc('is_admin');
      if (!esAdmin) { await sb.auth.signOut(); router.replace('/login'); return; }
      await cargarTodo();
      setListo(true);
    })();
  }, [router, cargarTodo]);

  async function salir() { await getSb().auth.signOut(); router.replace('/login'); }

  /* ---------- gestión de citas ---------- */
  async function confirmarCita(e) {
    e.preventDefault();
    const f = e.target;
    if (!f.fecha.value) { showToast('Elige la fecha confirmada.'); return; }
    const { error } = await getSb().from('citas').update({
      estado: 'confirmada',
      fecha_confirmada: new Date(f.fecha.value).toISOString(),
      nota_admin: f.nota.value.trim() || null,
    }).eq('id', modalGestion.id);
    if (error) { showToast('Error al confirmar.'); return; }
    setModalGestion(null);
    await cargarTodo();
    showToast('Cita confirmada.');
  }
  async function rechazarCita(nota) {
    if (!confirm('¿Rechazar esta solicitud de cita?')) return;
    const { error } = await getSb().from('citas').update({ estado: 'rechazada', nota_admin: nota || null }).eq('id', modalGestion.id);
    if (error) { showToast('Error al rechazar.'); return; }
    setModalGestion(null);
    await cargarTodo();
    showToast('Solicitud rechazada.');
  }

  /* ---------- bloqueos ---------- */
  async function crearBloqueo(e) {
    e.preventDefault();
    const f = e.target;
    const todoDia = f.tododia.checked;
    if (!todoDia && (!f.inicio.value || !f.fin.value)) { showToast('Indica hora desde y hasta.'); return; }
    if (!todoDia && f.inicio.value >= f.fin.value) { showToast('"Desde" debe ser antes de "hasta".'); return; }
    const { error } = await getSb().from('bloqueos').insert({
      fecha: f.fecha.value,
      todo_el_dia: todoDia,
      hora_inicio: todoDia ? null : f.inicio.value,
      hora_fin: todoDia ? null : f.fin.value,
      motivo: f.motivo.value.trim() || null,
    });
    if (error) { showToast('Error al bloquear.'); return; }
    setModalBloqueo(false);
    setDiaSel(f.fecha.value);
    await cargarTodo();
    showToast('Bloqueo agregado.');
  }
  async function quitarBloqueo(id) {
    if (!confirm('¿Quitar este bloqueo?')) return;
    const { error } = await getSb().from('bloqueos').delete().eq('id', id);
    if (error) { showToast('Error al quitar.'); return; }
    await cargarTodo();
    showToast('Bloqueo quitado.');
  }

  if (!listo) return <Cargando />;

  /* ---------- datos derivados ---------- */
  const f = filtro.trim().toLowerCase();
  const listaClientes = clientes.filter((c) => !f ||
    (c.nombre || '').toLowerCase().includes(f) ||
    (c.universidad || '').toLowerCase().includes(f) ||
    (c.carrera || '').toLowerCase().includes(f));

  const porDia = {};
  citasTodas.forEach((c) => {
    const d = isoADia(citaISO(c));
    porDia[d] = porDia[d] || { pend: 0, conf: 0 };
    c.estado === 'confirmada' ? porDia[d].conf++ : porDia[d].pend++;
  });
  const bloqPorDia = {};
  bloqueos.forEach((b) => { (bloqPorDia[b.fecha] = bloqPorDia[b.fecha] || []).push(b); });

  const year = mes.getFullYear(), month = mes.getMonth();
  let offset = new Date(year, month, 1).getDay() - 1; if (offset < 0) offset = 6;
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const hoyStr = fechaAStr(new Date());

  const citasDelDia = diaSel
    ? citasTodas.filter((c) => isoADia(citaISO(c)) === diaSel).sort((a, b) => (citaISO(a) < citaISO(b) ? -1 : 1))
    : [];
  const bloqsDelDia = diaSel ? (bloqPorDia[diaSel] || []) : [];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-linea bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <span className="flex items-center gap-2"><Marca size={28} /><span className="text-xs font-medium text-olivo">· Admin</span></span>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-linea bg-white px-3 py-1 text-xs text-piedra">
              {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
            </span>
            <button onClick={salir} className="btn-ghost !px-4 !py-1.5 text-xs">Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Clientes activos</h1>
            <p className="mt-1 text-sm text-piedra">Administra los accesos y el avance de cada cliente.</p>
          </div>
          <button onClick={() => setModalCliente({})} className="btn-olivo">+ Crear cliente</button>
        </div>

        {/* SOLICITUDES */}
        {pendientes.length > 0 && (
          <div className="mb-7 rounded-xl border border-olivo/30 bg-salvia/40 p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">
              Solicitudes de cita
              <span className="ml-2 rounded-full bg-olivo px-2.5 py-0.5 align-middle font-sans text-xs font-semibold text-white">
                {pendientes.length}
              </span>
            </h2>
            <div className="space-y-2.5">
              {pendientes.map((c) => (
                <button key={c.id} onClick={() => setModalGestion(c)}
                  className="card flex w-full items-center justify-between gap-4 p-4 text-left transition hover:border-olivo">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{c.clientes?.nombre || 'Cliente'}</p>
                    <p className="text-xs text-piedra">{[c.clientes?.universidad, c.clientes?.carrera].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 truncate text-sm text-piedra">{c.tema}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-olivo-prof">{fhCorta(c.fecha_propuesta)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CALENDARIO */}
        <div className="card mb-7 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Calendario de citas</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => setMes(new Date(year, month - 1, 1))} className="h-8 w-8 rounded-lg border border-linea transition hover:border-olivo">‹</button>
              <span className="min-w-[130px] text-center text-sm font-semibold capitalize">{MESES[month]} {year}</span>
              <button onClick={() => setMes(new Date(year, month + 1, 1))} className="h-8 w-8 rounded-lg border border-linea transition hover:border-olivo">›</button>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-piedra">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-olivo-neg" /> Pendiente</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-olivo" /> Confirmada</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-linea" /> Bloqueado</span>
            <button onClick={() => setModalBloqueo(true)} className="ml-auto rounded-lg border border-linea px-3 py-1.5 font-medium text-olivo-prof transition hover:border-olivo">
              + Bloquear día/horas
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DIAS.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-piedra">{d}</div>
            ))}
            {Array.from({ length: offset }).map((_, i) => <div key={'v' + i} />)}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const ds = `${year}-${pad2(month + 1)}-${pad2(dia)}`;
              const info = porDia[ds] || { pend: 0, conf: 0 };
              const bl = bloqPorDia[ds] || [];
              const diaCompleto = bl.some((b) => b.todo_el_dia);
              let cls = 'bg-white border-linea';
              if (diaCompleto) cls = 'bg-[repeating-linear-gradient(45deg,#EDEDED,#EDEDED_5px,#E0E0E0_5px,#E0E0E0_10px)] text-piedra border-linea';
              else if (info.conf) cls = 'bg-olivo/20 border-olivo font-bold text-olivo-prof';
              else if (info.pend) cls = 'bg-olivo-neg/25 border-olivo-neg font-bold text-olivo-prof';
              return (
                <button key={ds} onClick={() => setDiaSel(ds)}
                  className={`relative min-h-[42px] rounded-lg border text-sm transition hover:border-olivo ${cls}
                    ${ds === hoyStr ? 'shadow-[inset_0_0_0_2px_#141F17]' : ''}
                    ${ds === diaSel ? 'ring-2 ring-olivo' : ''}`}>
                  {dia}
                  {!diaCompleto && info.conf > 0 && info.pend > 0 && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-olivo-neg" />
                  )}
                  {!diaCompleto && bl.length > 0 && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-piedra" />
                  )}
                </button>
              );
            })}
          </div>
          {diaSel && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold capitalize">
                {new Date(diaSel + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {bloqsDelDia.map((b) => (
                <div key={b.id} className="mb-2 flex items-center justify-between rounded-lg bg-linea/50 px-4 py-2.5 text-sm text-piedra">
                  <span>🚫 Bloqueado: {b.todo_el_dia ? 'Todo el día' : `${b.hora_inicio?.slice(0, 5)} – ${b.hora_fin?.slice(0, 5)}`}{b.motivo ? ` · ${b.motivo}` : ''}</span>
                  <button onClick={() => quitarBloqueo(b.id)} className="text-xs underline hover:text-red-700">Quitar</button>
                </div>
              ))}
              {citasDelDia.length === 0 && bloqsDelDia.length === 0 && (
                <p className="text-sm text-piedra">No hay citas ni bloqueos este día.</p>
              )}
              {citasDelDia.map((c) => (
                <div key={c.id} className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-salvia/50 px-4 py-2.5 text-sm">
                  <span><b>{isoAHora(citaISO(c))}</b> · {c.clientes?.nombre || 'Cliente'} — {c.tema}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${c.estado === 'confirmada' ? 'bg-olivo text-white' : 'bg-olivo-neg/30 text-olivo-prof'}`}>
                    {c.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BUSCADOR + GRID */}
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} className="field mb-6"
          placeholder="Buscar por nombre, universidad o carrera..." />

        {clientes.length === 0 ? (
          <div className="card border-dashed p-12 text-center">
            <p className="font-display text-lg font-semibold">Aún no hay clientes</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-piedra">Crea tu primer cliente para asignarle usuario y clave.</p>
            <button onClick={() => setModalCliente({})} className="btn-olivo mt-5">Crear primer cliente</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listaClientes.map((c) => (
              <button key={c.id} onClick={() => setModalCliente(c)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-olivo hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olivo text-sm font-semibold text-white">
                    {iniciales(c.nombre)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.nombre}</span>
                    <span className="block truncate text-xs text-piedra">{[c.universidad, c.carrera].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-salvia px-2.5 py-0.5 text-[10px] font-semibold uppercase text-olivo-prof">
                    {c.nivel || 'Posgrado'}
                  </span>
                </div>
                <MiniAvance label="Elaboración de tesis" v={c.avance_tesis} color="bg-olivo" />
                <div className="mt-3"><MiniAvance label="Pagos" v={c.avance_pagos} color="bg-olivo-neg" /></div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODALES */}
      {modalCliente !== null && (
        <ModalCliente cliente={modalCliente.id ? modalCliente : null}
          clientes={clientes}
          onClose={() => setModalCliente(null)}
          onDone={async (msg) => { setModalCliente(null); await cargarTodo(); showToast(msg); }}
          showToast={showToast} />
      )}

      <Modal open={!!modalGestion} onClose={() => setModalGestion(null)} title="Gestionar solicitud de cita">
        {modalGestion && (
          <form onSubmit={confirmarCita}>
            <div className="mb-4 rounded-lg bg-salvia/50 px-4 py-3 text-sm">
              <p className="font-semibold">{modalGestion.clientes?.nombre || 'Cliente'}</p>
              <p className="mt-0.5 text-piedra">Propuesta: {fhCorta(modalGestion.fecha_propuesta)}</p>
              <p className="text-piedra">Tema: {modalGestion.tema}</p>
            </div>
            <div className="mb-4">
              <label className="lbl">Fecha y hora confirmada</label>
              <input name="fecha" type="datetime-local" defaultValue={isoToLocal(modalGestion.fecha_propuesta)} className="field" />
            </div>
            <div className="mb-5">
              <label className="lbl">Nota para el cliente (opcional)</label>
              <textarea name="nota" rows={2} className="field" placeholder="Ej. Confirmada por videollamada. Te envío el enlace." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={(e) => rechazarCita(e.target.form?.nota?.value)} className="text-sm text-red-700 underline">
                Rechazar solicitud
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalGestion(null)} className="btn-ghost">Cerrar</button>
                <button className="btn-olivo">Confirmar cita</button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalBloqueo} onClose={() => setModalBloqueo(false)} title="Bloquear disponibilidad">
        <p className="mb-4 text-sm text-piedra">Los clientes no podrán solicitar cita en los momentos bloqueados.</p>
        <BloqueoForm diaSel={diaSel} onSubmit={crearBloqueo} onCancel={() => setModalBloqueo(false)} />
      </Modal>

      {toast}
    </main>
  );
}

/* ---------- mini barra ---------- */
function MiniAvance({ label, v, color }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium">{label}</span><span className="font-semibold">{v}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-salvia"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${v}%` }} /></div>
    </div>
  );
}

/* ---------- formulario de bloqueo ---------- */
function BloqueoForm({ diaSel, onSubmit, onCancel }) {
  const [todoDia, setTodoDia] = useState(true);
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <label className="lbl">Fecha</label>
        <input name="fecha" type="date" defaultValue={diaSel || ''} required className="field" />
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input name="tododia" type="checkbox" checked={todoDia} onChange={(e) => setTodoDia(e.target.checked)} />
        Bloquear todo el día
      </label>
      {!todoDia && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div><label className="lbl">Desde</label><input name="inicio" type="time" className="field" /></div>
          <div><label className="lbl">Hasta</label><input name="fin" type="time" className="field" /></div>
        </div>
      )}
      {todoDia && <input name="inicio" type="hidden" /> }
      {todoDia && <input name="fin" type="hidden" /> }
      <div className="mb-5">
        <label className="lbl">Motivo (opcional)</label>
        <input name="motivo" className="field" placeholder="Ej. Feriado, ocupación personal" />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button className="btn-olivo">Bloquear</button>
      </div>
    </form>
  );
}

/* ---------- modal crear/editar cliente ---------- */
function ModalCliente({ cliente, clientes, onClose, onDone, showToast }) {
  const esEdicion = !!cliente;
  const [tesis, setTesis] = useState(cliente?.avance_tesis ?? 0);
  const [pagos, setPagos] = useState(cliente?.avance_pagos ?? 0);
  const [clave, setClave] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [entradas, setEntradas] = useState([]);
  const [notasCli, setNotasCli] = useState([]);

  const cargarBitacora = useCallback(async () => {
    if (!esEdicion) return;
    const sb = getSb();
    const [b, n] = await Promise.all([
      sb.from('bitacora').select('*').eq('cliente_id', cliente.id).order('fecha'),
      sb.from('notas_cliente').select('*').eq('cliente_id', cliente.id).order('creado'),
    ]);
    setEntradas(b.data || []);
    setNotasCli(n.data || []);
  }, [esEdicion, cliente]);

  useEffect(() => { cargarBitacora(); }, [cargarBitacora]);

  async function guardar(e) {
    e.preventDefault();
    const f = e.target;
    const base = {
      nombre: f.nombre.value.trim(),
      universidad: f.universidad.value.trim(),
      carrera: f.carrera.value.trim(),
      nivel: f.nivel.value,
      avance_tesis: tesis,
      avance_pagos: pagos,
    };
    if (!base.nombre || !base.universidad || !base.carrera) { showToast('Completa nombre, universidad y carrera.'); return; }
    setGuardando(true);
    const sb = getSb();

    if (esEdicion) {
      const { error } = await sb.from('clientes').update(base).eq('id', cliente.id);
      setGuardando(false);
      if (error) { showToast('Error al actualizar.'); return; }
      onDone('Cliente actualizado.');
      return;
    }

    const usuario = f.usuario.value.trim().toLowerCase();
    if (!usuario || !clave) { setGuardando(false); showToast('Asigna usuario y clave.'); return; }
    if (usuario.includes('@')) { setGuardando(false); showToast('El usuario no debe ser un correo. Ej: carlos.ramirez'); return; }
    if (clave.length < 6) { setGuardando(false); showToast('La clave debe tener al menos 6 caracteres.'); return; }
    if (clientes.some((c) => (c.usuario || '').toLowerCase() === usuario)) { setGuardando(false); showToast('Ese usuario ya existe.'); return; }

    const temp = makeTempClient();
    const { data: su, error: se } = await temp.auth.signUp({ email: usuarioAEmail(usuario), password: clave });
    if (se || !su.user) { setGuardando(false); showToast('No se pudo crear el acceso: ' + (se?.message || 'intenta otro usuario.')); return; }
    const { error: ie } = await sb.from('clientes').insert({ user_id: su.user.id, usuario, ...base });
    setGuardando(false);
    if (ie) { showToast('Se creó el acceso pero falló el registro: ' + ie.message); return; }
    onDone('Cliente creado. Usuario: ' + usuario);
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Se borrará su información y bitácora.`)) return;
    const { error } = await getSb().from('clientes').delete().eq('id', cliente.id);
    if (error) { showToast('Error al eliminar.'); return; }
    onDone('Cliente eliminado.');
  }

  async function addEntrada(e) {
    e.preventDefault();
    const f = e.target;
    if (!f.fecha.value || !f.actividad.value.trim()) { showToast('Completa fecha y actividad.'); return; }
    const { error } = await getSb().from('bitacora').insert({
      cliente_id: cliente.id, fecha: f.fecha.value,
      actividad: f.actividad.value.trim(), notas_asesor: f.notas.value.trim() || null,
    });
    if (error) { showToast('Error al guardar la entrada.'); return; }
    f.reset();
    await cargarBitacora();
    showToast('Entrada agregada.');
  }

  async function delEntrada(id) {
    if (!confirm('¿Eliminar esta entrada?')) return;
    const { error } = await getSb().from('bitacora').delete().eq('id', id);
    if (error) { showToast('Error al eliminar.'); return; }
    await cargarBitacora();
  }

  async function abrirDoc(path) {
    const { data, error } = await getSb().storage.from('documentos').createSignedUrl(path, 60);
    if (error || !data) { showToast('No se pudo abrir el documento.'); return; }
    window.open(data.signedUrl, '_blank');
  }

  const notasPorEntrada = {};
  notasCli.forEach((n) => { (notasPorEntrada[n.bitacora_id] = notasPorEntrada[n.bitacora_id] || []).push(n); });

  return (
    <Modal open onClose={onClose} title={esEdicion ? 'Editar cliente' : 'Nuevo cliente'} wide>
      <form onSubmit={guardar}>
        <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Datos del cliente</p>
        <div className="mb-4">
          <label className="lbl">Nombre completo</label>
          <input name="nombre" defaultValue={cliente?.nombre || ''} required className="field" placeholder="Ej. Carlos Ramírez" />
        </div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lbl">Universidad</label>
            <input name="universidad" defaultValue={cliente?.universidad || ''} required className="field" />
          </div>
          <div>
            <label className="lbl">Carrera / Programa</label>
            <input name="carrera" defaultValue={cliente?.carrera || ''} required className="field" />
          </div>
        </div>
        <div className="mb-4">
          <label className="lbl">Nivel</label>
          <select name="nivel" defaultValue={cliente?.nivel || 'Posgrado'} className="field">
            <option>Posgrado</option><option>Pregrado</option>
          </select>
        </div>

        {!esEdicion && (
          <>
            <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Acceso del cliente</p>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="lbl">Usuario (no es un correo)</label>
                <input name="usuario" autoComplete="off" className="field" placeholder="Ej. carlos.ramirez" />
              </div>
              <div>
                <label className="lbl">Clave</label>
                <div className="flex gap-2">
                  <input value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" className="field" placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setClave(genClave())}
                    className="shrink-0 rounded-lg border border-linea px-3 text-xs font-medium text-olivo-prof hover:border-olivo">
                    Generar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Avance</p>
        <div className="mb-3">
          <label className="lbl">Elaboración de tesis · {tesis}%</label>
          <input type="range" min="0" max="100" step="5" value={tesis} onChange={(e) => setTesis(+e.target.value)} className="w-full" />
        </div>
        <div className="mb-5">
          <label className="lbl">Pagos · {pagos}%</label>
          <input type="range" min="0" max="100" step="5" value={pagos} onChange={(e) => setPagos(+e.target.value)} className="w-full" />
        </div>

        {esEdicion && (
          <div className="mb-5">
            <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Bitácora de avance</p>
            <div className="mb-3 rounded-lg border border-linea bg-salvia/30 p-4">
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                <div><label className="lbl">Fecha</label><input form="bitform" name="fecha" type="date" className="field" /></div>
                <div><label className="lbl">Actividad realizada</label><input form="bitform" name="actividad" className="field" placeholder="Ej. Revisión del capítulo 2" /></div>
              </div>
              <textarea form="bitform" name="notas" rows={2} className="field mt-3" placeholder="Notas del asesor (opcional)..." />
              <button form="bitform" className="mt-3 rounded-lg border border-linea bg-white px-3 py-1.5 text-xs font-medium text-olivo-prof hover:border-olivo">
                + Agregar entrada
              </button>
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {entradas.length === 0 && <p className="py-2 text-center text-xs text-piedra">Aún no hay entradas.</p>}
              {entradas.map((en) => (
                <div key={en.id} className="card p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-olivo">{fCorta(en.fecha)}</span>
                    <button type="button" onClick={() => delEntrada(en.id)} className="text-xs text-piedra hover:text-red-700">✕</button>
                  </div>
                  <p className="text-sm font-semibold">{en.actividad}</p>
                  {en.notas_asesor && <p className="text-xs text-piedra">{en.notas_asesor}</p>}
                  {(notasPorEntrada[en.id] || []).length > 0 && (
                    <div className="mt-2 border-t border-dashed border-linea pt-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-olivo-neg">Del cliente:</p>
                      {notasPorEntrada[en.id].map((n) => (
                        <div key={n.id} className="mb-1.5 rounded-lg bg-salvia/50 px-3 py-1.5 text-xs">
                          {n.texto}
                          {n.documento_path && (
                            <button type="button" onClick={() => abrirDoc(n.documento_path)} className="mt-0.5 block font-medium text-olivo-prof underline">
                              📎 Ver documento
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-linea pt-4">
          {esEdicion ? (
            <button type="button" onClick={eliminar} className="text-sm text-red-700 underline">Eliminar cliente</button>
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button className="btn-olivo" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </form>
      {esEdicion && <form id="bitform" onSubmit={addEntrada} />}
    </Modal>
  );
}
