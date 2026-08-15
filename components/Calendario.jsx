'use client';
import { useState } from 'react';
import { getSb } from '@/lib/supabase';
import { pad2, fechaAStr, HORA_APERTURA, HORA_CIERRE, etiquetaHora } from '@/lib/horario';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const isoADia = (iso) => fechaAStr(new Date(iso));
const horaDeISO = (iso) => new Date(iso).getHours();
const isoAHora = (iso) => new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const citaISO = (c) => (c.estado === 'confirmada' && c.fecha_confirmada ? c.fecha_confirmada : c.fecha_propuesta);

/* eventos: [{ id, tipo:'cliente'|'prospecto', nombre, tema, iso, estado }]  */
export default function Calendario({ eventos, bloqueos, onGestionar, onRefrescar, showToast }) {
  const [vista, setVista] = useState('agenda');
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [diaSel, setDiaSel] = useState(fechaAStr(new Date()));
  const [filtro, setFiltro] = useState('todo'); // todo | cliente | prospecto

  const evs = eventos.filter((e) => filtro === 'todo' || e.tipo === filtro);

  const porDia = {};
  evs.forEach((e) => {
    const d = isoADia(e.iso);
    porDia[d] = porDia[d] || { conf: 0, pend: 0, prosp: 0, items: [] };
    porDia[d].items.push(e);
    if (e.tipo === 'prospecto') porDia[d].prosp++;
    else if (e.estado === 'confirmada') porDia[d].conf++;
    else porDia[d].pend++;
  });
  const bloqPorDia = {};
  bloqueos.forEach((b) => { (bloqPorDia[b.fecha] = bloqPorDia[b.fecha] || []).push(b); });

  /* ---------- acciones de bloqueo ---------- */
  async function bloquearHora(fecha, hora) {
    const { error } = await getSb().from('bloqueos').insert({
      fecha, todo_el_dia: false, hora_inicio: pad2(hora) + ':00:00', hora_fin: pad2(hora + 1) + ':00:00', motivo: null,
    });
    if (error) { showToast('Error al bloquear.'); return; }
    onRefrescar();
  }
  async function liberarHora(fecha, hora) {
    const delDia = (bloqPorDia[fecha] || []).filter((b) => !b.todo_el_dia &&
      b.hora_inicio && parseInt(b.hora_inicio.slice(0, 2), 10) === hora);
    for (const b of delDia) await getSb().from('bloqueos').delete().eq('id', b.id);
    onRefrescar();
  }
  async function quitarBloqueo(id) {
    if (!confirm('¿Quitar este bloqueo?')) return;
    await getSb().from('bloqueos').delete().eq('id', id);
    onRefrescar();
  }
  async function bloquearDia(fecha) {
    if (!confirm('¿Bloquear todo el día? No se podrán agendar citas.')) return;
    const { error } = await getSb().from('bloqueos').insert({ fecha, todo_el_dia: true, motivo: 'Día no disponible' });
    if (error) { showToast('Error al bloquear.'); return; }
    onRefrescar();
  }

  /* ============ VISTA AGENDA ============ */
  function VistaAgenda() {
    const futuros = evs.filter((e) => new Date(e.iso) >= new Date(new Date().toDateString()))
      .sort((a, b) => (a.iso < b.iso ? -1 : 1));
    const pend = evs.filter((e) => e.estado === 'pendiente' || (e.tipo === 'prospecto' && e.estado !== 'atendida'));
    const grupos = {};
    futuros.forEach((e) => { const d = isoADia(e.iso); (grupos[d] = grupos[d] || []).push(e); });

    return (
      <div>
        {pend.length > 0 && (
          <div className="mb-6 rounded-xl border border-terracotta/30 bg-terracotta/[0.06] p-4">
            <p className="mb-3 font-display text-sm font-semibold">
              Requieren tu atención
              <span className="ml-2 rounded-full bg-terracotta px-2 py-0.5 text-[11px] font-semibold text-white">{pend.length}</span>
            </p>
            <div className="space-y-2">
              {pend.map((e) => (
                <button key={e.id} onClick={() => onGestionar(e)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left text-sm transition hover:ring-1 hover:ring-olivo">
                  <span className="min-w-0 truncate"><b>{e.nombre}</b> — {e.tema}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Chip tipo={e.tipo} />
                    <span className="text-xs font-semibold text-piedra">{fmtFechaHora(e.iso)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {Object.keys(grupos).length === 0 ? (
          <p className="py-10 text-center text-sm text-piedra">No hay citas próximas.</p>
        ) : Object.entries(grupos).map(([dia, items]) => (
          <div key={dia} className="mb-5">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-piedra">{fmtDiaLargo(dia)}</p>
            <div className="space-y-2">
              {items.map((e) => (
                <button key={e.id} onClick={() => onGestionar(e)}
                  className={`flex w-full items-center gap-3 rounded-lg border bg-white px-3.5 py-2.5 text-left transition hover:ring-1 hover:ring-olivo
                    ${e.tipo === 'prospecto' ? 'border-l-[3px] border-l-terracotta' : 'border-l-[3px] border-l-olivo'} border-linea`}>
                  <span className="w-16 shrink-0 font-display text-sm font-semibold">{isoAHora(e.iso)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm"><b>{e.nombre}</b> — {e.tema}</span>
                  <EstadoPill e={e} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ============ VISTA MES ============ */
  function VistaMes() {
    const year = mes.getFullYear(), month = mes.getMonth();
    let offset = new Date(year, month, 1).getDay() - 1; if (offset < 0) offset = 6;
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const hoyStr = fechaAStr(new Date());
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMes(new Date(year, month - 1, 1))} className="h-8 w-8 rounded-lg border border-linea hover:border-olivo">‹</button>
            <span className="min-w-[130px] text-center text-sm font-semibold capitalize">{MESES[month]} {year}</span>
            <button onClick={() => setMes(new Date(year, month + 1, 1))} className="h-8 w-8 rounded-lg border border-linea hover:border-olivo">›</button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-piedra">
            <span className="flex items-center gap-1.5"><i className="flex h-4 w-4 items-center justify-center rounded bg-olivo text-[9px] text-white">1</i> confirmadas</span>
            <span className="flex items-center gap-1.5"><i className="flex h-4 w-4 items-center justify-center rounded bg-terracotta text-[9px] text-white">1</i> por atender</span>
            <span className="flex items-center gap-1.5"><i className="h-4 w-4 rounded border border-linea" style={{ background: 'repeating-linear-gradient(45deg,#EFEFEF,#EFEFEF 3px,#E3E3E3 3px,#E3E3E3 6px)' }} /> bloqueo</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS.map((d) => <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-piedra">{d}</div>)}
          {Array.from({ length: offset }).map((_, i) => <div key={'v' + i} />)}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const ds = `${year}-${pad2(month + 1)}-${pad2(dia)}`;
            const info = porDia[ds];
            const bl = bloqPorDia[ds] || [];
            const diaCompleto = bl.some((b) => b.todo_el_dia);
            return (
              <button key={ds} onClick={() => { setDiaSel(ds); setVista('dia'); }}
                className={`relative min-h-[56px] rounded-lg border bg-white p-1.5 text-left transition hover:border-olivo
                  ${ds === hoyStr ? 'border-2 border-tinta' : 'border-linea'}`}
                style={diaCompleto ? { background: 'repeating-linear-gradient(45deg,#F3F3F3,#F3F3F3 5px,#E8E8E8 5px,#E8E8E8 10px)' } : {}}>
                <span className="text-xs text-piedra">{dia}</span>
                <span className="mt-1 flex gap-1">
                  {info?.conf > 0 && <i className="flex h-4 w-4 items-center justify-center rounded bg-olivo text-[9px] font-semibold text-white">{info.conf}</i>}
                  {(info?.pend > 0 || info?.prosp > 0) && <i className="flex h-4 w-4 items-center justify-center rounded bg-terracotta text-[9px] font-semibold text-white">{(info.pend || 0) + (info.prosp || 0)}</i>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============ VISTA DÍA (franjas de 1 hora) ============ */
  function VistaDia() {
    const bl = bloqPorDia[diaSel] || [];
    const items = (porDia[diaSel]?.items) || [];
    const porHora = {};
    items.forEach((e) => { porHora[horaDeISO(e.iso)] = e; });
    const diaCompleto = bl.some((b) => b.todo_el_dia);
    const d = new Date(diaSel + 'T00:00:00');

    function estadoHora(h) {
      if (porHora[h]) return { tipo: 'evento', ev: porHora[h] };
      const b = bl.find((x) => !x.todo_el_dia && x.hora_inicio && parseInt(x.hora_inicio.slice(0, 2), 10) === h);
      if (b || diaCompleto) return { tipo: 'bloqueada' };
      return { tipo: 'libre' };
    }

    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setDiaSel(fechaAStr(new Date(new Date(diaSel).getTime() - 86400000)))} className="h-8 w-8 rounded-lg border border-linea hover:border-olivo">‹</button>
            <span className="text-sm font-semibold capitalize">{d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <button onClick={() => setDiaSel(fechaAStr(new Date(new Date(diaSel).getTime() + 86400000)))} className="h-8 w-8 rounded-lg border border-linea hover:border-olivo">›</button>
          </div>
          {!diaCompleto && <button onClick={() => bloquearDia(diaSel)} className="rounded-lg bg-tinta px-3 py-1.5 text-xs font-medium text-papel">Bloquear todo el día</button>}
          {diaCompleto && bl.filter((b) => b.todo_el_dia).map((b) => (
            <button key={b.id} onClick={() => quitarBloqueo(b.id)} className="rounded-lg border border-linea px-3 py-1.5 text-xs font-medium text-piedra hover:border-olivo">Liberar el día</button>
          ))}
        </div>
        <p className="mb-3 text-xs text-piedra">Toca una hora libre para bloquearla; una bloqueada para liberarla. De 00:00 a 08:00 no hay disponibilidad.</p>
        <div className="space-y-1.5">
          {Array.from({ length: 24 }).map((_, h) => {
            const sistema = h < HORA_APERTURA || h >= HORA_CIERRE;
            const est = estadoHora(h);
            if (sistema) {
              return (
                <div key={h} className="flex items-center gap-3 rounded-lg border border-linea/60 bg-salvia/20 px-3 py-2 text-sm text-piedra/60">
                  <span className="w-14 font-display font-semibold">{etiquetaHora(h)}</span>
                  <span className="flex-1">No disponible</span>
                </div>
              );
            }
            if (est.tipo === 'evento') {
              const e = est.ev;
              const prosp = e.tipo === 'prospecto';
              return (
                <button key={h} onClick={() => onGestionar(e)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition hover:ring-1 hover:ring-olivo
                    ${prosp ? 'border-terracotta bg-terracotta/[0.08] text-[#9C5A42]' : 'border-olivo bg-olivo/[0.10] text-olivo-prof'}`}>
                  <span className="w-14 font-display font-semibold">{etiquetaHora(h)}</span>
                  <span className="flex-1 truncate"><b>{e.nombre}</b> — {e.tema}</span>
                  <Chip tipo={e.tipo} />
                </button>
              );
            }
            if (est.tipo === 'bloqueada') {
              return (
                <div key={h} className="flex items-center gap-3 rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm text-piedra"
                  style={{ background: 'repeating-linear-gradient(45deg,#EFEFEF,#EFEFEF 5px,#E3E3E3 5px,#E3E3E3 10px)' }}>
                  <span className="w-14 font-display font-semibold">{etiquetaHora(h)}</span>
                  <span className="flex-1">Bloqueado</span>
                  {!diaCompleto && <button onClick={() => liberarHora(diaSel, h)} className="rounded-md border border-[#C9C9C9] bg-white px-2.5 py-1 text-xs">Liberar</button>}
                </div>
              );
            }
            return (
              <div key={h} className="flex items-center gap-3 rounded-lg border border-linea bg-white px-3 py-2 text-sm text-piedra">
                <span className="w-14 font-display font-semibold">{etiquetaHora(h)}</span>
                <span className="flex-1">Libre</span>
                <button onClick={() => bloquearHora(diaSel, h)} className="rounded-md border border-linea px-2.5 py-1 text-xs hover:border-olivo">Bloquear</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-salvia p-1">
          {['agenda', 'mes', 'dia'].map((v) => (
            <button key={v} onClick={() => setVista(v)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${vista === v ? 'bg-white shadow-sm' : 'text-piedra'}`}>
              {v === 'dia' ? 'Día' : v}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[['todo', 'Todo'], ['cliente', 'Clientes'], ['prospecto', 'Prospectos']].map(([v, t]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filtro === v ? 'bg-tinta text-papel' : 'border border-linea bg-white text-piedra'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {vista === 'agenda' && <VistaAgenda />}
      {vista === 'mes' && <VistaMes />}
      {vista === 'dia' && <VistaDia />}
    </div>
  );
}

/* ---------- auxiliares ---------- */
function Chip({ tipo }) {
  return tipo === 'prospecto'
    ? <span className="rounded-full bg-terracotta/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[#9C5A42]">Prospecto</span>
    : <span className="rounded-full bg-salvia px-2.5 py-0.5 text-[10px] font-semibold uppercase text-olivo-prof">Cliente</span>;
}
function EstadoPill({ e }) {
  if (e.tipo === 'prospecto') return <Chip tipo="prospecto" />;
  return e.estado === 'confirmada'
    ? <span className="rounded-full bg-olivo px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white">Confirmada</span>
    : <span className="rounded-full bg-terracotta/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[#9C5A42]">Pendiente</span>;
}
function fmtFechaHora(iso) {
  return new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDiaLargo(dia) {
  return new Date(dia + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
}
