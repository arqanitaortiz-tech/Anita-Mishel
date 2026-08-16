'use client';
import { useState } from 'react';
import { FACETAS } from '@/lib/facetas';
import AgendarConsulta from '@/components/AgendarConsulta';
import { Marca, LogoAM } from '@/components/Ui';

const WA = 'https://wa.me/593981347078?text=Hola%20Anita,%20me%20interesa%20tu%20asesor%C3%ADa%20de%20tesis';

const ACCIONES = [
  { key: 'agendar', label: 'Agendar', icon: 'ti-calendar-plus' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'ti-brand-whatsapp' },
  { key: 'redes', label: 'Redes', icon: 'ti-share' },
  { key: 'contacto', label: 'Contacto', icon: 'ti-mail' },
];

export default function Home() {
  const [faceta, setFaceta] = useState(null);
  const [agendar, setAgendar] = useState(false);
  const [panel, setPanel] = useState(null);

  function accion(k) {
    if (k === 'agendar') setAgendar(true);
    else if (k === 'whatsapp') window.open(WA, '_blank');
    else setPanel(k);
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-y-auto bg-papel sm:h-[100dvh] sm:overflow-hidden">

      {/* trama urbana + monograma de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(107,123,94,.05) 0 1px, transparent 1px 52px), repeating-linear-gradient(90deg, rgba(107,123,94,.05) 0 1px, transparent 1px 52px)' }} />
      <div aria-hidden className="pointer-events-none absolute -right-16 bottom-[-40px] opacity-[0.05] sm:right-24">
        <LogoAM size={340} plan={false} />
      </div>

      {/* ===== HEADER: marca + iniciar sesión ===== */}
      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <Marca size={30} />
        <a href="/login" className="btn-tinta !py-2 text-xs sm:text-sm"><i className="ti ti-lock mr-1.5" /> Iniciar sesión</a>
      </header>

      {/* ===== CUERPO ===== */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col sm:flex-row">

        {/* FACETAS: izquierda desktop / fila inferior mobile */}
        <nav className="order-3 flex shrink-0 items-stretch justify-between gap-1 overflow-x-auto border-t border-linea bg-white/70 px-2 py-2 backdrop-blur sm:order-1 sm:w-[104px] sm:flex-col sm:items-stretch sm:justify-center sm:gap-2 sm:border-t-0 sm:border-r sm:bg-transparent sm:py-4">
          {FACETAS.map((f) => (
            <button key={f.key} onClick={() => setFaceta(f)} className="group flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition hover:bg-salvia/50 sm:flex-none">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105" style={{ background: f.tint, color: f.color }}>
                <i className={`ti ${f.icon} text-[22px]`} />
              </span>
              <span className="text-[10px] font-medium leading-tight text-olivo-prof">{f.label}</span>
            </button>
          ))}
        </nav>

        {/* HERO centro */}
        <main className="order-1 flex flex-1 items-center justify-center px-6 py-6 sm:order-2 sm:px-10">
          <div className="flex w-full max-w-5xl flex-col items-center gap-8 sm:flex-row sm:gap-16">
            <div className="order-2 flex-1 text-center sm:order-1 sm:text-left">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2.5px] text-olivo-prof">Arquitecta urbanista · Asesora académica</p>
              <h1 className="font-display text-5xl font-semibold leading-[1] tracking-tight sm:text-6xl">Anita Mishel</h1>
              <p className="mt-3 font-display text-2xl font-medium leading-tight text-olivo sm:text-3xl">Tu tesis avanza,<br />tu vida no se detiene</p>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-piedra sm:mx-0">Acompaño a profesionales que estudian mientras trabajan, con el rigor de la investigación y la calidez de quien entiende tu vida.</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <button onClick={() => setAgendar(true)} className="btn-olivo gap-2"><i className="ti ti-calendar-plus" /> Agendar una consulta</button>
                <a href={WA} target="_blank" rel="noopener noreferrer" className="btn-ghost gap-2"><i className="ti ti-brand-whatsapp" /> WhatsApp</a>
              </div>
              <div className="mt-8 flex max-w-md items-stretch border-y border-linea sm:mx-0">
                {[['5', 'AÑOS'], ['+200', 'PROYECTOS'], ['Pre · Pos', 'GRADO']].map(([n, l], i) => (
                  <div key={l} className={`flex-1 py-3 text-center ${i < 2 ? 'border-r border-linea' : ''}`}>
                    <div className="font-display text-lg font-semibold">{n}</div>
                    <div className="text-[10px] tracking-wide text-piedra">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 w-64 shrink-0 sm:order-2 sm:w-[26rem] lg:w-[30rem]">
              <div className="relative">
                <div aria-hidden className="absolute -inset-3 -z-10 rounded-[2rem] bg-salvia/50" />
                <img src="/anita/hero.jpg" alt="Anita Mishel, asesora académica" className="w-full rounded-3xl border border-linea object-cover shadow-xl" style={{ aspectRatio: '4/5' }} />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tinta px-4 py-1.5 text-xs font-medium text-papel shadow-md sm:left-6 sm:translate-x-0">Arq. Urb. Anita Mishel</span>
              </div>
            </div>
          </div>
        </main>

        {/* ACCIONES: derecha desktop / fila mobile */}
        <nav className="order-2 flex shrink-0 items-center justify-center gap-6 bg-tinta px-3 py-2.5 sm:order-3 sm:w-[72px] sm:flex-col sm:justify-center sm:gap-6 sm:py-4">
          {ACCIONES.map((a) => (
            <button key={a.key} onClick={() => accion(a.key)} className="flex flex-col items-center gap-1 text-papel/70 transition hover:text-papel">
              <i className={`ti ${a.icon} text-[21px]`} />
              <span className="text-[9px]">{a.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* footer con vida */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-tinta px-5 py-2.5 text-papel sm:ml-[104px] sm:mr-[72px] sm:rounded-t-2xl sm:px-7">
        <span className="flex items-center gap-2.5">
          <LogoAM dark size={22} plan={false} />
          <span className="text-xs">
            <span className="font-display font-semibold">Arq. Urb. Anita Mishel</span>
            <span className="text-salvia-neg"> · Asesoría Académica · Ecuador</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <a href={WA} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-papel/80 transition hover:bg-olivo hover:text-white"><i className="ti ti-brand-whatsapp text-base" /></a>
          <a href="mailto:info@anitamishel.com" aria-label="Correo" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-papel/80 transition hover:bg-olivo hover:text-white"><i className="ti ti-mail text-base" /></a>
          <button onClick={() => setPanel('redes')} aria-label="Redes" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-papel/80 transition hover:bg-olivo hover:text-white"><i className="ti ti-share text-base" /></button>
        </span>
      </footer>

      {/* ===== OVERLAY DE FACETA ===== */}
      {faceta && <FacetaOverlay faceta={faceta} onClose={() => setFaceta(null)} onAgendar={() => { setFaceta(null); setAgendar(true); }} />}

      {/* ===== PANEL REDES / CONTACTO ===== */}
      {panel && <PanelInfo tipo={panel} onClose={() => setPanel(null)} />}

      <AgendarConsulta open={agendar} onClose={() => setAgendar(false)} />
    </div>
  );
}

/* ---------- fondo de marca reutilizable para overlays ---------- */
function FondoMarca({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" style={{ background: '#141F17F2' }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(138,154,125,.09) 0 1px, transparent 1px 46px), repeating-linear-gradient(90deg, rgba(138,154,125,.09) 0 1px, transparent 1px 46px)' }} />
      <div aria-hidden className="pointer-events-none absolute left-5 top-4 opacity-10"><LogoAM dark size={44} plan={false} /></div>
      <span aria-hidden className="pointer-events-none absolute bottom-4 right-6 font-display text-xs text-papel/30">anitamishel.com</span>
      {children}
    </div>
  );
}

/* ---------- overlay de faceta (lenguaje del piloto) ---------- */
function FacetaOverlay({ faceta, onClose, onAgendar }) {
  return (
    <FondoMarca>
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-papel shadow-2xl sm:flex-row" onClick={(e) => e.stopPropagation()}>
        {/* foto */}
        <div className="relative h-60 shrink-0 sm:h-auto sm:w-2/5">
          <img src={faceta.img} alt={faceta.label} className="h-full w-full object-cover object-top sm:object-center" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-tinta/85 to-transparent p-4">
            <p className="font-display text-[15px] font-semibold text-papel">Anita Mishel</p>
            <p className="text-[11px] text-salvia-neg">Arquitecta urbanista · Asesora académica</p>
          </div>
        </div>
        {/* contenido */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8">
          <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 text-piedra transition hover:text-tinta"><i className="ti ti-x text-xl" /></button>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: faceta.tint, color: faceta.color }}><i className={`ti ${faceta.icon} text-lg`} /></span>
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: faceta.color }}>{faceta.label}</span>
          </div>
          {faceta.voz && <p className="mb-4 font-display text-xl font-medium leading-snug tracking-tight sm:text-[22px]">{faceta.voz}</p>}
          <div className="flex-1">{faceta.contenido}</div>
          <div className="mt-6 flex items-end justify-between gap-4 border-t border-linea pt-4">
            <div className="leading-none">
              <span className="text-[38px] text-olivo-prof" style={{ fontFamily: 'Sacramento, cursive' }}>Anita Mishel</span>
            </div>
            <button onClick={onAgendar} className="btn-olivo shrink-0 gap-2"><i className="ti ti-calendar-plus" /> Agendar</button>
          </div>
        </div>
      </div>
    </FondoMarca>
  );
}

/* ---------- panel redes / contacto ---------- */
function PanelInfo({ tipo, onClose }) {
  return (
    <FondoMarca>
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-papel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-linea px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-salvia text-olivo-prof"><i className={`ti ${tipo === 'redes' ? 'ti-share' : 'ti-mail'} text-lg`} /></span>
          <h2 className="font-display text-lg font-semibold">{tipo === 'redes' ? 'Redes sociales' : 'Contacto'}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="ml-auto text-piedra hover:text-tinta"><i className="ti ti-x text-xl" /></button>
        </div>
        <div className="p-6">
          {tipo === 'redes' ? (
            <>
              <p className="mb-5 text-sm text-piedra">Sigue a Anita para consejos, novedades y contenido sobre tu proceso de tesis.</p>
              <div className="grid grid-cols-3 gap-3">
                {[['ti-brand-facebook', 'Facebook', 'https://www.facebook.com/anita.ortiz.5059'], ['ti-brand-instagram', 'Instagram', 'https://www.instagram.com/nena9120022017'], ['ti-brand-tiktok', 'TikTok', 'https://www.tiktok.com/@anitaortiz1991ov']].map(([ic, t, url]) => (
                  <a key={t} href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 rounded-xl border border-linea bg-white py-5 transition hover:border-olivo hover:bg-salvia/40">
                    <i className={`ti ${ic} text-2xl text-olivo-prof`} />
                    <span className="text-xs font-medium">{t}</span>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <a href={WA} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-linea bg-white p-4 transition hover:border-olivo">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1a7a3f]"><i className="ti ti-brand-whatsapp text-xl" /></span>
                <span><span className="block text-sm font-semibold">WhatsApp</span><span className="text-xs text-piedra">+593 98 134 7078</span></span>
              </a>
              <a href="mailto:info@anitamishel.com" className="flex items-center gap-3 rounded-xl border border-linea bg-white p-4 transition hover:border-olivo">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-salvia text-olivo-prof"><i className="ti ti-mail text-xl" /></span>
                <span><span className="block text-sm font-semibold">Correo</span><span className="text-xs text-piedra">info@anitamishel.com</span></span>
              </a>
              <div className="flex items-center gap-3 rounded-xl bg-salvia/40 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta/15 text-terracotta"><i className="ti ti-map-pin text-xl" /></span>
                <span className="text-sm text-piedra">Quito · Puyo · Ecuador — asesoría presencial y en línea</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </FondoMarca>
  );
}
