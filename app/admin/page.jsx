'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSb, makeTempClient, usuarioAEmail } from '@/lib/supabase';
import { Modal, useToast, Cargando, LogoAM } from '@/components/Ui';
import Calendario from '@/components/Calendario';
import BaseDatos from '@/components/BaseDatos';

const fCorta = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
const iniciales = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map((p) => (p[0] || '').toUpperCase()).join('');
const genClave = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 8; i++) o += c[Math.floor(Math.random() * c.length)]; return o; };
const isoToLocal = (iso) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const citaISO = (c) => (c.estado === 'confirmada' && c.fecha_confirmada ? c.fecha_confirmada : c.fecha_propuesta);
const fhCorta = (iso) => new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function fmtReunion(iso) {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date(); const man = new Date(Date.now() + 86400000);
  const mismoDia = (a, b) => a.toDateString() === b.toDateString();
  if (mismoDia(d, hoy)) return `Hoy · ${hora}`;
  if (mismoDia(d, man)) return `Mañana · ${hora}`;
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${hora}`;
}

const MENU = [
  ['resumen', 'Resumen'],
  ['clientes', 'Clientes'],
  ['calendario', 'Calendario'],
  ['basedatos', 'Base de datos'],
];

export default function Admin() {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [listo, setListo] = useState(false);
  const [seccion, setSeccion] = useState('resumen');

  const [clientes, setClientes] = useState([]);
  const [abonosTodos, setAbonosTodos] = useState([]);
  const [contactos, setContactos] = useState({});
  const [citas, setCitas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);

  const [modalCliente, setModalCliente] = useState(null);
  const [modalGestion, setModalGestion] = useState(null);
  const [filtro, setFiltro] = useState('');

  const cargarTodo = useCallback(async () => {
    const sb = getSb();
    const [cl, ab, ci, bl, ob] = await Promise.all([
      sb.from('clientes').select('*').order('creado', { ascending: false }),
      sb.from('abonos').select('*'),
      sb.from('citas').select('*, clientes(nombre)').in('estado', ['pendiente', 'confirmada']),
      sb.from('bloqueos').select('*'),
      sb.from('onboarding').select('cliente_id, correo, telefono'),
    ]);
    setClientes(cl.data || []);
    setAbonosTodos(ab.data || []);
    setCitas(ci.data || []);
    setBloqueos(bl.data || []);
    const map = {};
    (ob.data || []).forEach((o) => { map[o.cliente_id] = { correo: o.correo, telefono: o.telefono }; });
    setContactos(map);
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

  async function notificar(tipo, clienteId, datos) {
    try {
      const sb = getSb();
      const { data: { session } } = await sb.auth.getSession();
      await fetch('/api/notificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ tipo, clienteId, datos }),
      });
    } catch (e) { console.warn('aviso no enviado', e); }
  }

  async function confirmarCita(e) {
    e.preventDefault();
    const f = e.target;
    if (!f.fecha.value) { showToast('Elige la fecha confirmada.'); return; }
    const fechaISO = new Date(f.fecha.value).toISOString();
    const nota = f.nota.value.trim() || null;
    const { error } = await getSb().from('citas').update({ estado: 'confirmada', fecha_confirmada: fechaISO, nota_admin: nota }).eq('id', modalGestion.id);
    if (error) { showToast('Error al confirmar.'); return; }
    notificar('cita', modalGestion.cliente_id, { fecha: fechaISO, nota });
    setModalGestion(null); await cargarTodo(); showToast('Cita confirmada.');
  }
  async function rechazarCita(nota) {
    if (!confirm('¿Rechazar esta solicitud de cita?')) return;
    const { error } = await getSb().from('citas').update({ estado: 'rechazada', nota_admin: nota || null }).eq('id', modalGestion.id);
    if (error) { showToast('Error al rechazar.'); return; }
    setModalGestion(null); await cargarTodo(); showToast('Solicitud rechazada.');
  }

  if (!listo) return <Cargando />;

  /* ---------- datos derivados ---------- */
  const eventos = citas.map((c) => ({
    id: c.id, tipo: 'cliente', nombre: c.clientes?.nombre || 'Cliente', tema: c.tema,
    iso: citaISO(c), estado: c.estado, raw: c,
  }));

  const abonadoDe = (id) => Number((clientes.find((c) => c.id === id)?.anticipo) || 0) +
    abonosTodos.filter((a) => a.cliente_id === id).reduce((s, a) => s + Number(a.monto), 0);

  const registros = clientes.map((c) => ({
    id: c.id, nombre: c.nombre, estado: c.estado || 'activo', nivel: c.nivel,
    universidad: c.universidad, carrera: c.carrera, avanceTesis: c.avance_tesis,
    abonado: abonadoDe(c.id), montoTotal: Number(c.monto_total || 0),
    telefono: contactos[c.id]?.telefono || '', correo: contactos[c.id]?.correo || '', fechaInicio: c.fecha_inicio,
  }));

  const pendientes = eventos.filter((e) => e.estado === 'pendiente');
  const nActivos = clientes.filter((c) => (c.estado || 'activo') === 'activo').length;
  const nTerminados = clientes.filter((c) => c.estado === 'terminado').length;

  const hoy = new Date();
  const enEsteMes = (fechaStr) => {
    if (!fechaStr) return false;
    const d = new Date(fechaStr + 'T00:00:00');
    return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
  };
  const porCobrar = clientes
    .filter((c) => (c.estado || 'activo') === 'activo')
    .reduce((s, c) => s + Math.max(0, Number(c.monto_total || 0) - abonadoDe(c.id)), 0);
  const cobradoMes =
    abonosTodos.filter((a) => enEsteMes(a.fecha)).reduce((s, a) => s + Number(a.monto), 0) +
    clientes.filter((c) => enEsteMes(c.fecha_inicio)).reduce((s, c) => s + Number(c.anticipo || 0), 0);
  const proximas = eventos
    .filter((e) => e.estado === 'confirmada' && new Date(e.iso) >= hoy)
    .sort((a, b) => (a.iso < b.iso ? -1 : 1)).slice(0, 5);
  const cobros = clientes
    .filter((c) => (c.estado || 'activo') === 'activo' && Number(c.monto_total || 0) > 0)
    .map((c) => ({ id: c.id, nombre: c.nombre, abonado: abonadoDe(c.id), monto: Number(c.monto_total), saldo: Number(c.monto_total) - abonadoDe(c.id) }))
    .filter((x) => x.saldo > 0.005).sort((a, b) => b.saldo - a.saldo).slice(0, 6);
  const usd0 = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-EC');

  const f = filtro.trim().toLowerCase();
  const listaClientes = clientes.filter((c) => !f ||
    (c.nombre || '').toLowerCase().includes(f) || (c.universidad || '').toLowerCase().includes(f) || (c.carrera || '').toLowerCase().includes(f));

  function onGestionar(ev) {
    if (ev.tipo === 'cliente') setModalGestion(ev.raw);
  }

  return (
    <div className="flex min-h-screen">
      {/* MENÚ LATERAL */}
      <aside className="flex w-[150px] shrink-0 flex-col gap-1 bg-tinta p-3 text-papel sm:w-[168px]">
        <span className="mb-3 flex items-center gap-2 px-1 py-1">
          <LogoAM dark size={22} plan={false} />
          <span className="font-display text-sm font-semibold">Admin</span>
        </span>
        {MENU.map(([k, t]) => (
          <button key={k} onClick={() => setSeccion(k)}
            className={`rounded-lg px-3 py-2 text-left text-sm transition ${seccion === k ? 'bg-white/10 font-medium text-papel' : 'text-papel/60 hover:text-papel'}`}>
            {t}
          </button>
        ))}
        <button onClick={salir} className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-papel/50 hover:text-papel">Salir</button>
      </aside>

      {/* CONTENIDO */}
      <main className="min-w-0 flex-1 bg-papel p-6 sm:p-8">
        {seccion === 'resumen' && (
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Resumen</h1>

            {/* Indicadores */}
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="card p-4">
                <p className="text-xs text-piedra">Clientes activos</p>
                <p className="mt-1 font-display text-2xl font-semibold">{nActivos}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-piedra">Prospectos</p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#9C5A42]">0</p>
              </div>
              <div className="rounded-xl bg-tinta p-4 text-papel">
                <p className="text-xs text-papel/70">Por cobrar</p>
                <p className="mt-1 font-display text-2xl font-semibold">{usd0(porCobrar)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-piedra">Cobrado este mes</p>
                <p className="mt-1 font-display text-2xl font-semibold text-olivo-prof">{usd0(cobradoMes)}</p>
              </div>
            </div>

            {/* Atención + próximas */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-terracotta/30 bg-terracotta/[0.06] p-4">
                <p className="mb-3 font-display text-sm font-semibold">
                  Requieren tu atención
                  <span className="ml-2 rounded-full bg-terracotta px-2 py-0.5 text-[11px] font-semibold text-white">{pendientes.length}</span>
                </p>
                {pendientes.length === 0 ? (
                  <p className="text-sm text-piedra">Nada pendiente por ahora.</p>
                ) : (
                  <div className="space-y-2">
                    {pendientes.map((e) => (
                      <button key={e.id} onClick={() => onGestionar(e)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left text-sm transition hover:ring-1 hover:ring-olivo">
                        <span className="min-w-0 truncate"><b>{e.nombre}</b> · solicita cita</span>
                        <span className="shrink-0 text-xs font-semibold text-olivo-prof">{fhCorta(e.iso)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4">
                <p className="mb-3 font-display text-sm font-semibold">Reuniones agendadas</p>
                {proximas.length === 0 ? (
                  <p className="text-sm text-piedra">No tienes reuniones confirmadas próximas.</p>
                ) : (
                  <div className="space-y-2.5">
                    {proximas.map((e) => (
                      <div key={e.id} className="rounded-lg border-l-[3px] border-l-olivo border border-linea bg-salvia/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{e.nombre}</span>
                          <span className="shrink-0 font-display text-xs font-semibold text-olivo-prof">{fmtReunion(e.iso)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-piedra">{e.tema}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cobros pendientes */}
            <div className="card mt-4 p-4">
              <p className="mb-3 font-display text-sm font-semibold">Cobros pendientes</p>
              {cobros.length === 0 ? (
                <p className="text-sm text-piedra">Todos los clientes activos están al día.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {cobros.map((c) => (
                      <tr key={c.id} className="border-b border-linea last:border-0">
                        <td className="py-2 font-medium">{c.nombre}</td>
                        <td className="py-2 text-piedra">{usd0(c.abonado)} de {usd0(c.monto)}</td>
                        <td className="py-2 text-right font-semibold text-[#9C5A42]">Debe {usd0(c.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {seccion === 'clientes' && (
          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">Clientes</h1>
                <p className="mt-1 text-sm text-piedra">Administra los accesos y el avance de cada cliente.</p>
              </div>
              <button onClick={() => setModalCliente({})} className="btn-olivo">+ Crear cliente</button>
            </div>
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} className="field mb-6" placeholder="Buscar por nombre, universidad o carrera..." />
            {clientes.length === 0 ? (
              <div className="card border-dashed p-12 text-center">
                <p className="font-display text-lg font-semibold">Aún no hay clientes</p>
                <button onClick={() => setModalCliente({})} className="btn-olivo mt-5">Crear primer cliente</button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listaClientes.map((c) => {
                  const abonado = abonadoDe(c.id); const monto = Number(c.monto_total || 0);
                  const pct = monto > 0 ? Math.min(100, Math.round((abonado / monto) * 100)) : 0;
                  const terminado = c.estado === 'terminado';
                  return (
                    <button key={c.id} onClick={() => setModalCliente(c)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-olivo hover:shadow-md">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olivo text-sm font-semibold text-white">{iniciales(c.nombre)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{c.nombre}</span>
                          <span className="block truncate text-xs text-piedra">{[c.universidad, c.carrera].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${terminado ? 'bg-[#EDECE8] text-piedra' : 'bg-salvia text-olivo-prof'}`}>
                          {terminado ? 'Terminado' : (c.nivel || 'Posgrado')}
                        </span>
                      </div>
                      <MiniAvance label="Elaboración de tesis" v={c.avance_tesis} color="bg-olivo" />
                      <div className="mt-3"><MiniAvance label={monto > 0 ? `Pagos · $${abonado.toFixed(0)} de $${monto.toFixed(0)}` : 'Pagos · sin definir'} v={pct} color="bg-olivo-neg" /></div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {seccion === 'calendario' && (
          <div>
            <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight">Calendario</h1>
            <Calendario eventos={eventos} bloqueos={bloqueos} onGestionar={onGestionar} onRefrescar={cargarTodo} showToast={showToast} />
          </div>
        )}

        {seccion === 'basedatos' && (
          <div>
            <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight">Base de datos</h1>
            <BaseDatos registros={registros} />
          </div>
        )}
      </main>

      {/* MODAL CLIENTE */}
      {modalCliente !== null && (
        <ModalCliente cliente={modalCliente.id ? modalCliente : null} clientes={clientes}
          onClose={() => setModalCliente(null)}
          onDone={async (msg) => { setModalCliente(null); await cargarTodo(); showToast(msg); }}
          onRefrescar={cargarTodo} notificar={notificar} showToast={showToast} />
      )}

      {/* MODAL GESTIÓN CITA */}
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
              <textarea name="nota" rows={2} className="field" placeholder="Ej. Confirmada por videollamada." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={(e) => rechazarCita(e.target.form?.nota?.value)} className="text-sm text-red-700 underline">Rechazar</button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalGestion(null)} className="btn-ghost">Cerrar</button>
                <button className="btn-olivo">Confirmar cita</button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {toast}
    </div>
  );
}

function MiniAvance({ label, v, color }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{label}</span><span className="font-semibold">{v}%</span></div>
      <div className="h-1.5 rounded-full bg-salvia"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${v}%` }} /></div>
    </div>
  );
}

/* ============================================================
   MODAL CREAR / EDITAR CLIENTE
   ============================================================ */
function ModalCliente({ cliente, clientes, onClose, onDone, onRefrescar, notificar, showToast }) {
  const esEdicion = !!cliente;
  const [tesis, setTesis] = useState(cliente?.avance_tesis ?? 0);
  const [clave, setClave] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [entradas, setEntradas] = useState([]);
  const [notasCli, setNotasCli] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [contrato, setContrato] = useState(null);

  const cargar = useCallback(async () => {
    if (!esEdicion) return;
    const sb = getSb();
    const [b, n, a, co] = await Promise.all([
      sb.from('bitacora').select('*').eq('cliente_id', cliente.id).order('fecha'),
      sb.from('notas_cliente').select('*').eq('cliente_id', cliente.id).order('creado'),
      sb.from('abonos').select('*').eq('cliente_id', cliente.id).order('fecha'),
      sb.from('contratos').select('*').eq('cliente_id', cliente.id).limit(1),
    ]);
    setEntradas(b.data || []); setNotasCli(n.data || []); setAbonos(a.data || []); setContrato(co.data?.[0] || null);
  }, [esEdicion, cliente]);
  useEffect(() => { cargar(); }, [cargar]);

  const anticipo = Number(cliente?.anticipo || 0);
  const totalAbonado = anticipo + abonos.reduce((s, a) => s + Number(a.monto), 0);
  const montoTotal = Number(cliente?.monto_total || 0);
  const pagosCompletos = montoTotal > 0 && totalAbonado >= montoTotal;
  const terminado = cliente?.estado === 'terminado';

  async function guardar(e) {
    e.preventDefault();
    const f = e.target;
    const base = {
      nombre: f.nombre.value.trim(), universidad: f.universidad.value.trim(), carrera: f.carrera.value.trim(),
      nivel: f.nivel.value, avance_tesis: tesis,
      fecha_inicio: f.fechainicio.value || null,
      monto_total: f.monto.value ? Number(f.monto.value) : null,
      anticipo: f.anticipo.value ? Number(f.anticipo.value) : 0,
      contrato_tipo: f.contratotipo.value,
    };
    if (!base.nombre || !base.universidad || !base.carrera) { showToast('Completa nombre, universidad y carrera.'); return; }
    if (base.monto_total != null && base.anticipo > base.monto_total) { showToast('El anticipo no puede superar el monto total.'); return; }
    setGuardando(true);
    const sb = getSb();
    if (esEdicion) {
      const { error } = await sb.from('clientes').update(base).eq('id', cliente.id);
      setGuardando(false);
      if (error) { showToast('Error al actualizar.'); return; }
      onDone('Cliente actualizado.'); return;
    }
    const usuario = f.usuario.value.trim().toLowerCase();
    if (!usuario || !clave) { setGuardando(false); showToast('Asigna usuario y clave.'); return; }
    if (usuario.includes('@')) { setGuardando(false); showToast('El usuario no debe ser un correo.'); return; }
    if (clave.length < 6) { setGuardando(false); showToast('La clave debe tener al menos 6 caracteres.'); return; }
    if (clientes.some((c) => (c.usuario || '').toLowerCase() === usuario)) { setGuardando(false); showToast('Ese usuario ya existe.'); return; }
    const temp = makeTempClient();
    const { data: su, error: se } = await temp.auth.signUp({ email: usuarioAEmail(usuario), password: clave });
    if (se || !su.user) { setGuardando(false); showToast('No se pudo crear el acceso: ' + (se?.message || '')); return; }
    const { error: ie } = await sb.from('clientes').insert({ user_id: su.user.id, usuario, estado: 'activo', ...base });
    setGuardando(false);
    if (ie) { showToast('Se creó el acceso pero falló el registro: ' + ie.message); return; }
    onDone('Cliente creado. Usuario: ' + usuario);
  }

  async function marcarTerminado() {
    if (tesis !== 100) { showToast('El avance de tesis debe estar en 100%.'); return; }
    if (!pagosCompletos) { showToast('Los pagos deben estar completos (100%).'); return; }
    const { error } = await getSb().from('clientes').update({ estado: 'terminado', avance_tesis: 100 }).eq('id', cliente.id);
    if (error) { showToast('Error al actualizar.'); return; }
    onDone('Cliente marcado como terminado.');
  }
  async function reactivar() {
    const { error } = await getSb().from('clientes').update({ estado: 'activo' }).eq('id', cliente.id);
    if (error) { showToast('Error al reactivar.'); return; }
    onDone('Cliente reactivado.');
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
    const { error } = await getSb().from('bitacora').insert({ cliente_id: cliente.id, fecha: f.fecha.value, actividad: f.actividad.value.trim(), notas_asesor: f.notas.value.trim() || null });
    if (error) { showToast('Error al guardar.'); return; }
    f.reset(); await cargar(); showToast('Entrada agregada.');
  }
  async function delEntrada(id) {
    if (!confirm('¿Eliminar esta entrada?')) return;
    await getSb().from('bitacora').delete().eq('id', id); await cargar();
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
      {esEdicion && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-salvia/40 px-4 py-2.5">
          <span className="text-sm">Estado: <b>{terminado ? 'Terminado' : 'Activo'}</b></span>
          {terminado
            ? <button type="button" onClick={reactivar} className="text-xs font-medium text-olivo-prof underline">Reactivar</button>
            : <button type="button" onClick={marcarTerminado} className={`text-xs font-medium underline ${tesis === 100 && pagosCompletos ? 'text-olivo-prof' : 'text-piedra'}`} title="Requiere tesis y pagos al 100%">Marcar como terminado</button>}
        </div>
      )}
      <form onSubmit={guardar}>
        <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Datos del cliente</p>
        <div className="mb-4"><label className="lbl">Nombre completo</label><input name="nombre" defaultValue={cliente?.nombre || ''} required className="field" /></div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div><label className="lbl">Universidad</label><input name="universidad" defaultValue={cliente?.universidad || ''} required className="field" /></div>
          <div><label className="lbl">Carrera / Programa</label><input name="carrera" defaultValue={cliente?.carrera || ''} required className="field" /></div>
        </div>
        <div className="mb-4"><label className="lbl">Nivel</label>
          <select name="nivel" defaultValue={cliente?.nivel || 'Posgrado'} className="field"><option>Posgrado</option><option>Pregrado</option></select>
        </div>

        <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Contrato</p>
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div><label className="lbl">Fecha de inicio</label><input name="fechainicio" type="date" defaultValue={cliente?.fecha_inicio || ''} className="field" /></div>
          <div><label className="lbl">Monto total (USD)</label><input name="monto" type="number" step="0.01" min="0" defaultValue={cliente?.monto_total ?? ''} className="field" placeholder="300" /></div>
          <div><label className="lbl">Anticipo (USD)</label><input name="anticipo" type="number" step="0.01" min="0" defaultValue={cliente?.anticipo ?? ''} className="field" placeholder="150" /></div>
        </div>
        <div className="mb-4"><label className="lbl">Firma del contrato</label>
          <select name="contratotipo" defaultValue={cliente?.contrato_tipo || 'digital'} className="field">
            <option value="digital">Digital — el cliente firma en la plataforma</option>
            <option value="fisico">Físico — ya firmado en papel</option>
          </select>
          {esEdicion && <p className="mt-1.5 text-xs text-piedra">
            {contrato ? <>Contrato {contrato.tipo === 'fisico' ? 'físico' : `No. A-${contrato.anio}-${String(contrato.num).padStart(3, '0')}`} firmado
              {contrato.pdf_path && <button type="button" onClick={() => abrirDoc(contrato.pdf_path)} className="ml-2 font-medium text-olivo-prof underline">Ver PDF</button>}</>
              : 'Aún sin contrato firmado en la plataforma.'}
          </p>}
        </div>

        {!esEdicion && (
          <>
            <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Acceso del cliente</p>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div><label className="lbl">Usuario (no es correo)</label><input name="usuario" autoComplete="off" className="field" placeholder="carlos.ramirez" /></div>
              <div><label className="lbl">Clave</label>
                <div className="flex gap-2">
                  <input value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="off" className="field" placeholder="Mínimo 6" />
                  <button type="button" onClick={() => setClave(genClave())} className="shrink-0 rounded-lg border border-linea px-3 text-xs font-medium text-olivo-prof hover:border-olivo">Generar</button>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Avance</p>
        <div className="mb-5"><label className="lbl">Elaboración de tesis · {tesis}%</label>
          <input type="range" min="0" max="100" step="5" value={tesis} onChange={(e) => setTesis(+e.target.value)} className="w-full" />
        </div>

        {esEdicion && <AbonosSection cliente={cliente} abonos={abonos} onCambio={async () => { await cargar(); onRefrescar?.(); }} notificar={notificar} showToast={showToast} />}

        {esEdicion && (
          <div className="mb-5">
            <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Bitácora de avance</p>
            <div className="mb-3 rounded-lg border border-linea bg-salvia/30 p-4">
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                <div><label className="lbl">Fecha</label><input form="bitform" name="fecha" type="date" className="field" /></div>
                <div><label className="lbl">Actividad realizada</label><input form="bitform" name="actividad" className="field" placeholder="Revisión del capítulo 2" /></div>
              </div>
              <textarea form="bitform" name="notas" rows={2} className="field mt-3" placeholder="Notas del asesor (opcional)..." />
              <button form="bitform" className="mt-3 rounded-lg border border-linea bg-white px-3 py-1.5 text-xs font-medium text-olivo-prof hover:border-olivo">+ Agregar entrada</button>
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
                          {n.documento_path && <button type="button" onClick={() => abrirDoc(n.documento_path)} className="mt-0.5 block font-medium text-olivo-prof underline">📎 Ver documento</button>}
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
          {esEdicion ? <button type="button" onClick={eliminar} className="text-sm text-red-700 underline">Eliminar cliente</button> : <span />}
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

/* ---------- abonos ---------- */
function AbonosSection({ cliente, abonos, onCambio, notificar, showToast }) {
  const [abFecha, setAbFecha] = useState('');
  const [abMonto, setAbMonto] = useState('');
  const [abNota, setAbNota] = useState('');
  const monto = Number(cliente.monto_total || 0);
  const anticipo = Number(cliente.anticipo || 0);
  const total = anticipo + abonos.reduce((s, a) => s + Number(a.monto), 0);
  const pct = monto > 0 ? Math.min(100, Math.round((total / monto) * 100)) : 0;
  const fmt = (n) => '$' + Number(n).toFixed(2);

  async function agregar() {
    const valor = Number(abMonto);
    if (!abFecha || !valor || valor <= 0) { showToast('Completa fecha y monto.'); return; }
    const { error } = await getSb().from('abonos').insert({ cliente_id: cliente.id, fecha: abFecha, monto: valor, nota: abNota.trim() || null });
    if (error) { showToast('Error al registrar el abono: ' + error.message); return; }
    notificar?.('abono', cliente.id, { fecha: abFecha, monto: valor, totalAbonado: total + valor, montoTotal: monto, saldo: Math.max(0, monto - total - valor) });
    setAbFecha(''); setAbMonto(''); setAbNota(''); await onCambio(); showToast('Abono registrado.');
  }
  async function eliminar(id) {
    if (!confirm('¿Eliminar este abono?')) return;
    await getSb().from('abonos').delete().eq('id', id); await onCambio(); showToast('Abono eliminado.');
  }

  return (
    <div className="mb-5">
      <p className="mb-3 border-b border-linea pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-olivo">Pagos y abonos</p>
      <div className="mb-3 rounded-lg bg-salvia/30 p-3">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="font-medium">{monto > 0 ? `Abonado ${fmt(total)} de ${fmt(monto)} · Saldo ${fmt(Math.max(0, monto - total))}` : 'Define el monto total arriba'}</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white"><div className="h-1.5 rounded-full bg-olivo-neg" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="mb-3 grid gap-3 rounded-lg border border-linea bg-salvia/30 p-3 sm:grid-cols-[130px_110px_1fr_auto]">
        <input type="date" value={abFecha} onChange={(e) => setAbFecha(e.target.value)} className="field" />
        <input type="number" step="0.01" min="0" placeholder="Monto" value={abMonto} onChange={(e) => setAbMonto(e.target.value)} className="field" />
        <input placeholder="Nota (opcional)" value={abNota} onChange={(e) => setAbNota(e.target.value)} className="field" />
        <button type="button" onClick={agregar} className="rounded-lg border border-linea bg-white px-3 py-1.5 text-xs font-medium text-olivo-prof hover:border-olivo">+ Abono</button>
      </div>
      {(anticipo > 0 || abonos.length > 0) && (
        <div className="max-h-36 space-y-1.5 overflow-y-auto">
          {anticipo > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-linea bg-salvia/40 px-3 py-2 text-sm">
              <span className="text-piedra">Anticipo (a la firma) · se ajusta arriba</span><b>{fmt(anticipo)}</b>
            </div>
          )}
          {abonos.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-linea bg-white px-3 py-2 text-sm">
              <span className="text-piedra">{fCorta(a.fecha)}{a.nota ? ` · ${a.nota}` : ''}</span>
              <span className="flex items-center gap-3"><b>{fmt(a.monto)}</b><button type="button" onClick={() => eliminar(a.id)} className="text-xs text-piedra hover:text-red-700">✕</button></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
