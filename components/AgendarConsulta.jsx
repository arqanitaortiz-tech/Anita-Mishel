'use client';
import { useState } from 'react';
import { Modal } from '@/components/Ui';

/* Modal público para que un prospecto agende una consulta.
   Reutilizable: se abre con `open` y se cierra con `onClose`.
   Pensado para colgar de la franja izquierda del futuro front page. */
export default function AgendarConsulta({ open, onClose }) {
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    setError('');
    const f = e.target;
    if (!f.acepta.checked) { setError('Debes aceptar los términos y la política de cookies.'); return; }
    const body = {
      nombres: f.nombres.value, correo: f.correo.value, telefono: f.telefono.value,
      ciudad: f.ciudad.value, universidad: f.universidad.value, nivel: f.nivel.value,
      tema: f.tema.value, dia: f.dia.value, hora: Number(f.hora.value),
    };
    setEnviando(true);
    try {
      const res = await fetch('/api/consulta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const out = await res.json();
      if (!res.ok) {
        if (res.status === 409) { alert(out.error); }  // horario no disponible
        else setError(out.error || 'No se pudo agendar.');
        setEnviando(false);
        return;
      }
      setOk(true);
    } catch (err) {
      setError('No se pudo enviar. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  }

  function cerrar() { setOk(false); setError(''); onClose(); }

  return (
    <Modal open={open} onClose={cerrar} title={ok ? '¡Solicitud enviada!' : 'Agenda una consulta'} wide>
      {ok ? (
        <div className="py-4 text-center">
          <p className="text-sm text-piedra">
            Recibimos tu solicitud. Te enviamos un correo de confirmación y te contactaremos pronto para agendar tu consulta.
          </p>
          <button onClick={cerrar} className="btn-olivo mt-6">Cerrar</button>
        </div>
      ) : (
        <form onSubmit={enviar}>
          <p className="mb-5 text-sm text-piedra">
            ¿Tienes dudas sobre nuestro servicio? Agenda una consulta y conversamos sobre tu proyecto.
          </p>
          <div className="mb-4">
            <label className="lbl">Nombres completos</label>
            <input name="nombres" required className="field" placeholder="Tu nombre completo" />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div><label className="lbl">Correo electrónico</label><input name="correo" type="email" required className="field" placeholder="tu@correo.com" /></div>
            <div><label className="lbl">Teléfono</label><input name="telefono" required className="field" placeholder="09..." /></div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div><label className="lbl">Ciudad</label><input name="ciudad" required className="field" placeholder="Quito, Puyo..." /></div>
            <div><label className="lbl">Universidad</label><input name="universidad" required className="field" /></div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="lbl">Nivel</label>
              <select name="nivel" defaultValue="Posgrado" className="field"><option>Posgrado</option><option>Pregrado</option></select>
            </div>
            <div>
              <label className="lbl">¿En qué te ayudamos?</label>
              <input name="tema" required className="field" placeholder="Ej. Asesoría de tesis de maestría" />
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div><label className="lbl">Día</label><input name="dia" type="date" required className="field" /></div>
            <div>
              <label className="lbl">Hora (1 hora)</label>
              <select name="hora" required defaultValue="" className="field">
                <option value="" disabled>Elige...</option>
                {Array.from({ length: 15 }).map((_, i) => { const h = i + 8; return <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>; })}
              </select>
            </div>
          </div>
          <label className="mb-4 flex items-start gap-2.5 text-sm">
            <input name="acepta" type="checkbox" className="mt-1" />
            <span>
              Acepto los <a href="#" className="text-olivo underline" onClick={(e) => e.preventDefault()}>términos y condiciones</a> y la{' '}
              <a href="#" className="text-olivo underline" onClick={(e) => e.preventDefault()}>política de cookies</a>.
            </span>
          </label>
          {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={cerrar} className="btn-ghost">Cancelar</button>
            <button className="btn-olivo" disabled={enviando}>{enviando ? 'Enviando...' : 'Agendar consulta'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
