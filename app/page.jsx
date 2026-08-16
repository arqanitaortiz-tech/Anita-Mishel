'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FACETAS } from '@/lib/facetas';
import AgendarConsulta from '@/components/AgendarConsulta';

const WA = 'https://wa.me/593981347078?text=Hola%20Anita,%20me%20interesa%20tu%20asesor%C3%ADa%20de%20tesis';

const ACCIONES = [
  { key: 'agendar', label: 'Agendar', icon: 'ti-calendar-plus' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'ti-brand-whatsapp' },
  { key: 'clientes', label: 'Clientes', icon: 'ti-lock' },
  { key: 'redes', label: 'Redes', icon: 'ti-share' },
  { key: 'contacto', label: 'Contacto', icon: 'ti-mail' },
];

export default function Home() {
  const [faceta, setFaceta] = useState(null);
  const [agendar, setAgendar] = useState(false);
  const [panel, setPanel] = useState(null); // 'redes' | 'contacto'

  function accion(k) {
    if (k === 'agendar') setAgendar(true);
    else if (k === 'whatsapp') window.open(WA, '_blank');
    else if (k === 'clientes') window.location.href = '/login';
    else setPanel(k);
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-papel sm:flex-row">

      {/* ===== FACETAS (izquierda desktop / fila mobile) ===== */}
      <nav className="order-2 flex shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-linea bg-salvia/40 px-2 py-2 sm:order-1 sm:w-[96px] sm:flex-col sm:justify-center sm:gap-3 sm:border-t-0 sm:border-r sm:py-4">
        {FACETAS.map((f) => (
          <button key={f.key} onClick={() => setFaceta(f)} className="group flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition hover:bg-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105" style={{ background: f.tint, color: f.color }}>
              <i className={`ti ${f.icon} text-[22px]`} />
            </span>
            <span className="text-[10px] font-medium text-olivo-prof">{f.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== HERO (centro) ===== */}
      <main className="order-1 flex flex-1 items-center justify-center px-6 py-8 sm:order-2">
        <div className="flex max-w-3xl flex-col items-center gap-8 sm:flex-row sm:gap-12">
          <div className="order-2 max-w-md text-center sm:order-1 sm:text-left">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-olivo-prof">Arquitecta urbanista · Asesora académica</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Anita Mishel</h1>
            <p className="mt-2 font-display text-xl font-medium text-olivo sm:text-2xl">Tu tesis avanza,<br />tu vida no se detiene</p>
            <p className="mx-auto mt-4 max-w-sm text-sm text-piedra sm:mx-0">Acompaño a profesionales que estudian mientras trabajan, con el rigor de la investigación y la calidez de quien entiende tu vida.</p>
            <button onClick={() => setAgendar(true)} className="btn-olivo mt-6 gap-2">
              <i className="ti ti-calendar-plus" /> Agendar una consulta
            </button>
          </div>
          <div className="order-1 w-52 shrink-0 sm:order-2 sm:w-60">
            <img src="/anita/hero.jpg" alt="Anita Mishel, asesora académica" className="w-full rounded-2xl border border-linea object-cover shadow-md" style={{ aspectRatio: '4/5' }} />
          </div>
        </div>
      </main>

      {/* ===== ACCIONES (derecha desktop / fila mobile) ===== */}
      <nav className="order-3 flex shrink-0 items-center justify-center gap-4 bg-tinta px-3 py-2.5 sm:w-[70px] sm:flex-col sm:justify-center sm:gap-5 sm:py-4">
        {ACCIONES.map((a) => (
          <button key={a.key} onClick={() => accion(a.key)} className="flex flex-col items-center gap-1 text-papel/70 transition hover:text-papel">
            <i className={`ti ${a.icon} text-[20px]`} />
            <span className="text-[9px]">{a.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== FOOTER ===== */}
      <footer className="pointer-events-none absolute bottom-0 left-0 right-0 hidden py-1.5 text-center text-[11px] text-piedra sm:left-[96px] sm:right-[70px] sm:block">
        Arq. Urb. Anita Mishel · Asesoría Académica · Ecuador
      </footer>

      {/* ===== OVERLAY DE FACETA ===== */}
      {faceta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setFaceta(null)}>
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-papel shadow-2xl sm:flex-row">
            <div className="h-48 shrink-0 sm:h-auto sm:w-2/5">
              <img src={faceta.img} alt={faceta.label} className="h-full w-full object-cover" />
            </div>
            <div className="relative flex-1 overflow-y-auto p-6 sm:p-8">
              <button onClick={() => setFaceta(null)} aria-label="Cerrar" className="absolute right-4 top-4 text-piedra transition hover:text-tinta"><i className="ti ti-x text-xl" /></button>
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: faceta.tint, color: faceta.color }}><i className={`ti ${faceta.icon} text-xl`} /></span>
              <h2 className="mb-4 font-display text-2xl font-semibold">{faceta.titulo}</h2>
              {faceta.contenido}
              <button onClick={() => { setFaceta(null); setAgendar(true); }} className="btn-olivo mt-6 gap-2"><i className="ti ti-calendar-plus" /> Agendar una consulta</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PANEL REDES / CONTACTO ===== */}
      {panel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setPanel(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-papel p-7 text-center shadow-2xl">
            {panel === 'redes' ? (
              <>
                <h2 className="mb-1 font-display text-xl font-semibold">Redes sociales</h2>
                <p className="mb-5 text-sm text-piedra">Síguela para consejos y novedades.</p>
                <div className="flex justify-center gap-3">
                  {[['ti-brand-facebook', '#'], ['ti-brand-instagram', '#'], ['ti-brand-tiktok', '#']].map(([ic, url]) => (
                    <a key={ic} href={url} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-full bg-salvia text-olivo-prof transition hover:bg-olivo hover:text-white"><i className={`ti ${ic} text-xl`} /></a>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-1 font-display text-xl font-semibold">Contacto</h2>
                <p className="mb-5 text-sm text-piedra">Escríbenos por el medio que prefieras.</p>
                <div className="space-y-2 text-sm">
                  <a href={WA} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-linea py-2.5 hover:border-olivo"><i className="ti ti-brand-whatsapp text-olivo" /> +593 98 134 7078</a>
                  <a href="mailto:info@anitamishel.com" className="flex items-center justify-center gap-2 rounded-lg border border-linea py-2.5 hover:border-olivo"><i className="ti ti-mail text-olivo" /> info@anitamishel.com</a>
                  <p className="flex items-center justify-center gap-2 py-1 text-piedra"><i className="ti ti-map-pin text-terracotta" /> Ecuador</p>
                </div>
              </>
            )}
            <button onClick={() => setPanel(null)} className="btn-ghost mt-6">Cerrar</button>
          </div>
        </div>
      )}

      <AgendarConsulta open={agendar} onClose={() => setAgendar(false)} />
    </div>
  );
}
