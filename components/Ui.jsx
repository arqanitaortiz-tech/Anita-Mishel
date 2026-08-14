'use client';
import { useState, useCallback, useRef } from 'react';

/* ---------- LOGO ---------- */
export function LogoAM({ dark = false, size = 40, plan = true }) {
  const colA = dark ? '#FAFAF6' : '#141F17';
  const colM = dark ? '#8A9A7D' : '#6B7B5E';
  const guia = dark ? '#3A4634' : '#C9D1C1';
  return (
    <svg viewBox="0 0 140 64" height={size} aria-label="Anita Mishel">
      {plan && (
        <g>
          <line x1="6" y1="12" x2="134" y2="12" stroke={guia} strokeWidth="1.2" />
          <line x1="6" y1="50" x2="134" y2="50" stroke={guia} strokeWidth="1.2" />
          <line x1="22" y1="4" x2="22" y2="60" stroke={guia} strokeWidth="1.2" />
          <line x1="118" y1="4" x2="118" y2="60" stroke={guia} strokeWidth="1.2" />
        </g>
      )}
      <path d="M22 50 L40 12 L58 50" fill="none" stroke={colA} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="30" y1="36" x2="50" y2="36" stroke={colA} strokeWidth="5" strokeLinecap="round" />
      <path d="M68 50 V12 L93 40 L118 12 V50" fill="none" stroke={colM} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Marca({ dark = false, size = 34 }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoAM dark={dark} size={size} plan={false} />
      <span className={`font-display text-lg font-semibold tracking-tight ${dark ? 'text-papel' : 'text-tinta'}`}>
        Anita Mishel
      </span>
    </span>
  );
}

/* ---------- MODAL ---------- */
export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta/50 p-5 pt-10 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} animate-[fadeIn_.2s_ease]`}>
        <div className="flex items-center justify-between border-b border-linea px-6 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar" className="text-piedra transition hover:text-tinta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- TOAST ---------- */
export function useToast() {
  const [msg, setMsg] = useState(null);
  const t = useRef(null);
  const show = useCallback((m) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  const el = msg ? (
    <div className="fixed bottom-7 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-tinta px-5 py-3 text-sm text-papel shadow-lg">
      {msg}
    </div>
  ) : null;
  return [el, show];
}

/* ---------- BARRA DE AVANCE ---------- */
export function Avance({ label, value, olive = true }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="font-display text-base font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-salvia">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${olive ? 'bg-olivo' : 'bg-olivo-neg'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- BADGE DE ESTADO ---------- */
export function Badge({ estado }) {
  const map = {
    pendiente: 'bg-salvia text-olivo-prof',
    confirmada: 'bg-olivo text-white',
    rechazada: 'bg-linea text-piedra',
  };
  const txt = { pendiente: 'Pendiente', confirmada: 'Confirmada', rechazada: 'No disponible' };
  return (
    <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map[estado] || map.pendiente}`}>
      {txt[estado] || estado}
    </span>
  );
}

/* ---------- CARGANDO ---------- */
export function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LogoAM size={36} plan={false} />
    </div>
  );
}
