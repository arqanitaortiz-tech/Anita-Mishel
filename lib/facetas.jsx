'use client';
/* Contenido de las 5 facetas del front page.
   Cada una: color de acento, línea de voz y contenido con vida. */
import { useState, useEffect } from 'react';
import { getSb } from './supabase';

const EJEMPLOS_TESTIMONIOS = [
  ['Trabajo de lunes a sábado y tenía miedo de no terminar la maestría. Con Anita organicé mis tiempos y hoy ya tengo mi tesis aprobada.', 'Carlos R.', 'MBA', 'CR'],
  ['La calma con la que me guió fue lo que más me ayudó. Nunca me sentí juzgada por mis dudas.', 'María F.', 'Maestría en Educación', 'MF'],
  ['Llevaba dos años estancado. En cuatro meses con Anita logré lo que no había podido en dos años.', 'Andrés P.', 'Gestión Pública', 'AP'],
];
const inicialesDe = (n) => (n || '').trim().split(/\s+/).slice(0, 2).map((p) => (p[0] || '').toUpperCase()).join('') || '·';

function TestimonioCard({ q, n, r, ini }) {
  return (
    <div className="rounded-xl border border-linea bg-white p-4">
      <i className="ti ti-quote text-lg text-terracotta/60" />
      <p className="mt-1 text-[13.5px] leading-snug text-tinta/85">{q}</p>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-terracotta/15 text-[11px] font-semibold text-terracotta">{ini}</span>
        <div><p className="text-xs font-semibold">{n}</p><p className="text-[11px] text-piedra">{r}</p></div>
      </div>
    </div>
  );
}

function TestimoniosLive() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let vivo = true;
    getSb().from('testimonios').select('nombre_pila, profesion, texto')
      .eq('estado', 'publicado').order('publicado_en', { ascending: false }).limit(6)
      .then(({ data }) => { if (vivo) setItems(data || []); })
      .catch(() => { if (vivo) setItems([]); });
    return () => { vivo = false; };
  }, []);

  const lista = (items && items.length)
    ? items.map((t) => ({ q: t.texto, n: t.nombre_pila || '', r: t.profesion || '', ini: inicialesDe(t.nombre_pila) }))
    : EJEMPLOS_TESTIMONIOS.map(([q, n, r, ini]) => ({ q, n, r, ini }));

  return (
    <div className="space-y-3">
      {lista.map((t, i) => <TestimonioCard key={i} {...t} />)}
    </div>
  );
}

export const FACETAS = [
  {
    key: 'quiensoy',
    label: 'Quién soy',
    icon: 'ti-user-heart',
    color: '#6B7B5E',
    tint: 'rgba(107,123,94,0.16)',
    img: '/anita/quiensoy.jpg',
    voz: 'No escribo tu tesis por ti. Camino contigo para que la escribas con confianza.',
    contenido: (
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed text-tinta/85">
          Arquitecta urbanista por la <b className="text-olivo-prof">Universidad Indoamérica</b> y asesora académica por vocación.
          Sé lo que es sacar adelante un título <span className="rounded bg-olivo/15 px-1.5 py-0.5 font-medium text-olivo-prof">mientras la vida no se detiene</span> —
          porque también soy madre, esposa y una profesional que se sigue formando.
        </p>
        <div className="flex items-stretch border-y border-linea">
          {[['5', 'AÑOS'], ['+200', 'PROYECTOS'], ['Pre · Pos', 'GRADO']].map(([n, l], i) => (
            <div key={l} className={`flex-1 py-3 text-center ${i < 2 ? 'border-r border-linea' : ''}`}>
              <div className="font-display text-lg font-semibold">{n}</div>
              <div className="text-[10px] tracking-wide text-piedra">{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'trayectoria',
    label: 'Trayectoria',
    icon: 'ti-award',
    color: '#46543C',
    tint: 'rgba(70,84,60,0.16)',
    img: '/anita/trayectoria.jpg',
    voz: 'Cinco años y más de doscientos proyectos me enseñaron a acompañar sin atajos.',
    contenido: (
      <div className="space-y-2.5">
        {[
          ['ti-building-arch', 'Arquitecta Urbanista', 'Universidad Indoamérica, Ecuador.'],
          ['ti-books', 'Metodología de la investigación', 'Diseño y estructura de proyectos con rigor.'],
          ['ti-file-text', 'Artículos científicos', 'Redacción y publicación académica.'],
          ['ti-bulb', 'Aprendizaje basado en problemas', 'Formación en ABPR.'],
        ].map(([ic, t, d]) => (
          <div key={t} className="flex items-start gap-3 rounded-xl border border-linea bg-white p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-olivo-prof/12 text-olivo-prof"><i className={`ti ${ic} text-lg`} /></span>
            <div><p className="text-sm font-semibold">{t}</p><p className="text-[12px] text-piedra">{d}</p></div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'comotrabajo',
    label: 'Cómo trabajo',
    icon: 'ti-route',
    color: '#6B7B5E',
    tint: 'rgba(107,123,94,0.16)',
    img: '/anita/comotrabajo.jpg',
    voz: 'Tu proceso, a tu ritmo — con método, calma y cero juicios.',
    contenido: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['ti-clock', 'Flexibilidad horaria', 'Sesiones que se adaptan a tu agenda.', 'bg-olivo/12 text-olivo-prof'],
          ['ti-user-heart', 'Acompañamiento 1 a 1', 'Trabajo individual, entendiendo tu tema.', 'bg-salvia-neg/20 text-olivo-prof'],
          ['ti-calendar-check', 'Cumplimiento', 'Planificación realista, sin estrés.', 'bg-olivo-prof/12 text-olivo-prof'],
          ['ti-shield-lock', 'Confidencialidad', 'Tu proceso e identidad, reservados.', 'bg-terracotta/15 text-terracotta'],
        ].map(([ic, t, d, cls]) => (
          <div key={t} className="rounded-xl border border-linea bg-white p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${cls}`}><i className={`ti ${ic} text-lg`} /></span>
            <p className="mt-2.5 text-sm font-semibold">{t}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-piedra">{d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'servicios',
    label: 'Servicios',
    icon: 'ti-list-check',
    color: '#8A9A7D',
    tint: 'rgba(138,154,125,0.18)',
    img: '/anita/servicios.jpg',
    voz: 'Desde la primera idea hasta el día de tu defensa.',
    contenido: (
      <div className="space-y-2.5">
        {[
          ['ti-file-description', 'Tesis completa', 'Acompañamiento integral, de la propuesta a la defensa.'],
          ['ti-edit', 'Revisión y corrección', 'Observaciones de estructura, contenido y estilo.'],
          ['ti-typography', 'Corrección de estilo', 'Formato, citas, referencias y normas de tu institución.'],
          ['ti-shield-check', 'Antiplagio', 'Reducción del índice de similitud, de forma ética.'],
        ].map(([ic, t, d]) => (
          <div key={t} className="flex items-center gap-3 rounded-xl border border-linea bg-white p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-salvia-neg/20 text-olivo-prof"><i className={`ti ${ic} text-lg`} /></span>
            <div className="min-w-0"><p className="text-sm font-semibold">{t}</p><p className="truncate text-[12px] text-piedra">{d}</p></div>
          </div>
        ))}
        <p className="pt-1 text-center text-[12px] text-piedra">Los precios se conversan en la consulta, según tu necesidad.</p>
      </div>
    ),
  },
  {
    key: 'testimonios',
    label: 'Testimonios',
    icon: 'ti-quote',
    color: '#C17A5F',
    tint: 'rgba(193,122,95,0.18)',
    img: '/anita/testimonios.jpg',
    voz: 'Lo que dicen quienes ya llegaron a la meta.',
    contenido: <TestimoniosLive />,
  },
];
