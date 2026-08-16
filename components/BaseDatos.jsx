'use client';
import { useState } from 'react';

const MESES = ['Todos','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const usd = (n) => '$' + Number(n || 0).toFixed(0);

const BADGE = {
  activo: 'bg-salvia text-olivo-prof',
  prospecto: 'bg-terracotta/20 text-[#9C5A42]',
  terminado: 'bg-[#EDECE8] text-piedra',
};
const ETQ = { activo: 'Activo', prospecto: 'Prospecto', terminado: 'Terminado' };

/* registros: [{ id, nombre, estado, nivel, universidad, carrera, avanceTesis,
   abonado, montoTotal, telefono, correo, fechaInicio }] */
export default function BaseDatos({ registros }) {
  const [estado, setEstado] = useState('todo');
  const [anio, setAnio] = useState('todos');
  const [mes, setMes] = useState(0);

  const anios = [...new Set(registros.map((r) => (r.fechaInicio ? new Date(r.fechaInicio + 'T00:00:00').getFullYear() : null)).filter(Boolean))].sort((a, b) => b - a);

  const filtrados = registros.filter((r) => {
    if (estado !== 'todo' && r.estado !== estado) return false;
    if (r.fechaInicio) {
      const d = new Date(r.fechaInicio + 'T00:00:00');
      if (anio !== 'todos' && d.getFullYear() !== Number(anio)) return false;
      if (mes !== 0 && d.getMonth() + 1 !== mes) return false;
    } else if (anio !== 'todos' || mes !== 0) {
      return false; // sin fecha no entra en filtros de periodo
    }
    return true;
  });

  const cuenta = (e) => registros.filter((r) => e === 'todo' || r.estado === e).length;

  async function exportar() {
    const XLSX = await import('xlsx');
    const filas = filtrados.map((r) => ({
      Cliente: r.nombre,
      Estado: ETQ[r.estado] || r.estado,
      Nivel: r.nivel || '',
      Universidad: r.universidad || '',
      Carrera: r.carrera || '',
      'Avance tesis (%)': r.estado === 'prospecto' ? '' : r.avanceTesis,
      Abonado: r.estado === 'prospecto' ? '' : Number(r.abonado || 0),
      'Monto total': r.estado === 'prospecto' ? '' : Number(r.montoTotal || 0),
      Teléfono: r.telefono || '',
      Correo: r.correo || '',
      'Fecha inicio': r.fechaInicio || '',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    const nombre = `AnitaMishel-clientes-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nombre);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[['todo', 'Todos'], ['activo', 'Activos'], ['prospecto', 'Prospectos'], ['terminado', 'Terminados']].map(([v, t]) => (
          <button key={v} onClick={() => setEstado(v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${estado === v ? 'bg-tinta text-papel' : 'border border-linea bg-white text-piedra'}`}>
            {t} · {cuenta(v)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select value={anio} onChange={(e) => setAnio(e.target.value)} className="rounded-lg border border-linea bg-white px-2.5 py-1.5 text-xs">
            <option value="todos">Año: todos</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="rounded-lg border border-linea bg-white px-2.5 py-1.5 text-xs">
            {MESES.map((m, i) => <option key={m} value={i}>{i === 0 ? 'Mes: todos' : m}</option>)}
          </select>
          <button onClick={exportar} className="rounded-lg bg-olivo px-3.5 py-1.5 text-xs font-medium text-white hover:bg-olivo-prof">↓ Excel</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-linea">
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-salvia/50 text-left text-olivo-prof">
              {['Cliente', 'Estado', 'Nivel', 'Universidad', 'Tesis', 'Pagos', 'Contacto', 'Inicio'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-piedra">Ningún registro con estos filtros.</td></tr>
            )}
            {filtrados.map((r, i) => (
              <tr key={r.id} className={`border-t border-linea ${i % 2 ? 'bg-[#FCFBF8]' : 'bg-white'}`}>
                <td className="px-3 py-2.5 font-medium">{r.nombre}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE[r.estado]}`}>{ETQ[r.estado]}</span></td>
                <td className="px-3 py-2.5">{r.nivel || '—'}</td>
                <td className="px-3 py-2.5">{r.universidad || '—'}</td>
                <td className="px-3 py-2.5">{r.estado === 'prospecto' ? '—' : `${r.avanceTesis}%`}</td>
                <td className="px-3 py-2.5">{r.estado === 'prospecto' ? '—' : `${usd(r.abonado)} / ${usd(r.montoTotal)}`}</td>
                <td className="px-3 py-2.5 text-piedra">{r.telefono || r.correo || '—'}</td>
                <td className="px-3 py-2.5 text-piedra">{r.fechaInicio ? new Date(r.fechaInicio + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 px-1 text-xs text-piedra">{filtrados.length} registro(s)</p>
    </div>
  );
}
