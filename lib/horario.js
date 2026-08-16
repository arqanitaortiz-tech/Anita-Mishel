/* Reglas de horario compartidas entre admin y portal.
   Cita = 1 hora. Disponible 08:00–23:00 (horas de inicio 08..22).
   00:00–08:00 = bloqueo permanente del sistema. */

export const HORA_APERTURA = 8;   // primera hora que se puede reservar (08:00)
export const HORA_CIERRE = 23;    // fin del horario (última cita 22:00–23:00)

export function horasDisponibles() {
  const hs = [];
  for (let h = HORA_APERTURA; h < HORA_CIERRE; h++) hs.push(h);
  return hs; // [8..22]
}

export function etiquetaHora(h) {
  return String(h).padStart(2, '0') + ':00';
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function fechaAStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/* Devuelve el motivo por el que una hora NO está disponible, o null si está libre.
   bloqueosDia: filas de bloqueos de ese día. citasHoras: set de horas ocupadas. */
export function porQueNoDisponible(hora, bloqueosDia, horasOcupadas) {
  if (hora < HORA_APERTURA || hora >= HORA_CIERRE) return 'fuera';
  if (horasOcupadas.has(hora)) return 'ocupada';
  for (const b of bloqueosDia) {
    if (b.todo_el_dia) return 'bloqueada';
    if (b.hora_inicio && b.hora_fin) {
      const hi = parseInt(b.hora_inicio.slice(0, 2), 10);
      const hf = parseInt(b.hora_fin.slice(0, 2), 10);
      if (hora >= hi && hora < hf) return 'bloqueada';
    }
  }
  return null;
}
