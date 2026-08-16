'use client';
/* Contenido de las 5 facetas del front page.
   La imagen es la protagonista; el texto acompaña. */

export const FACETAS = [
  {
    key: 'quiensoy',
    label: 'Quién soy',
    icon: 'ti-user-heart',
    color: '#6B7B5E',
    tint: 'rgba(107,123,94,0.14)',
    img: '/anita/quiensoy.jpg',
    titulo: 'Quién soy',
    contenido: (
      <div className="space-y-3 text-[15px] leading-relaxed text-tinta/90">
        <p>Soy Anita Mishel, <b>arquitecta urbanista</b> por la Universidad Indoamérica y <b>asesora académica</b> por vocación. La investigación me enseñó a estructurar ideas con método y a no rendirme ante un problema difícil.</p>
        <p>Y también sé, de primera mano, lo que es sacar adelante un título <b>mientras la vida no se detiene</b>: el trabajo, la familia, los tiempos que aprietan. Soy madre, esposa y una profesional que se sigue formando.</p>
        <p>Mi trabajo no es escribir tu tesis por ti: es <b>orientarte, estructurarte y caminar contigo</b> para que la escribas con confianza, calidad y en los tiempos que necesitas.</p>
      </div>
    ),
  },
  {
    key: 'trayectoria',
    label: 'Trayectoria',
    icon: 'ti-award',
    color: '#46543C',
    tint: 'rgba(70,84,60,0.14)',
    img: '/anita/trayectoria.jpg',
    titulo: 'Trayectoria y formación',
    contenido: (
      <div className="space-y-3 text-[15px] leading-relaxed text-tinta/90">
        <p>Cinco años acompañando <b>más de 200 proyectos de investigación</b>, de pregrado y posgrado, en distintas profesiones.</p>
        <ul className="space-y-2">
          <li className="flex gap-2"><i className="ti ti-building-arch mt-0.5 text-olivo" /> Arquitecta Urbanista · Universidad Indoamérica, Ecuador.</li>
          <li className="flex gap-2"><i className="ti ti-books mt-0.5 text-olivo" /> Investigación y metodología de la investigación.</li>
          <li className="flex gap-2"><i className="ti ti-file-text mt-0.5 text-olivo" /> Redacción de artículos científicos.</li>
          <li className="flex gap-2"><i className="ti ti-bulb mt-0.5 text-olivo" /> Aprendizaje basado en problemas (ABPR).</li>
        </ul>
      </div>
    ),
  },
  {
    key: 'comotrabajo',
    label: 'Cómo trabajo',
    icon: 'ti-route',
    color: '#6B7B5E',
    tint: 'rgba(107,123,94,0.14)',
    img: '/anita/comotrabajo.jpg',
    titulo: 'Cómo trabajo',
    contenido: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['ti-clock', 'Flexibilidad horaria', 'Sesiones que se adaptan a tu agenda de profesional ocupado.'],
          ['ti-user-heart', 'Acompañamiento personalizado', 'Trabajo contigo de forma individual, entendiendo tu tema.'],
          ['ti-calendar-check', 'Cumplimiento en tiempos', 'Planificación realista para que cumplas tus fechas sin estrés.'],
          ['ti-shield-lock', 'Confidencialidad', 'Tu proceso y tu identidad quedan siempre reservados.'],
        ].map(([ic, t, d]) => (
          <div key={t} className="rounded-xl border border-linea bg-white p-4">
            <i className={`ti ${ic} text-xl text-olivo`} />
            <p className="mt-2 text-sm font-semibold">{t}</p>
            <p className="mt-1 text-[13px] text-piedra">{d}</p>
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
    tint: 'rgba(138,154,125,0.16)',
    img: '/anita/servicios.jpg',
    titulo: 'Servicios',
    contenido: (
      <div className="space-y-3">
        <p className="text-[13px] text-piedra">Cada servicio se adapta a tu necesidad. Los precios se conversan en la consulta.</p>
        {[
          ['Tesis completa', 'Acompañamiento integral desde la propuesta hasta la defensa final.'],
          ['Revisión y corrección', 'Revisión de tu borrador con observaciones de estructura, contenido y estilo.'],
          ['Corrección de estilo', 'Formato, citas, referencias y normas académicas de tu institución.'],
          ['Antiplagio', 'Revisión con herramientas especializadas para reducir el índice de similitud de forma ética.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-linea bg-white p-3.5">
            <p className="text-sm font-semibold">{t}</p>
            <p className="mt-0.5 text-[13px] text-piedra">{d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'testimonios',
    label: 'Testimonios',
    icon: 'ti-quote',
    color: '#C17A5F',
    tint: 'rgba(193,122,95,0.16)',
    img: '/anita/testimonios.jpg',
    titulo: 'Lo que dicen quienes ya pasaron por aquí',
    contenido: (
      <div className="space-y-3">
        {[
          ['"Trabajo de lunes a sábado y tenía miedo de no terminar la maestría. Con Anita organicé mis tiempos y hoy ya tengo mi tesis aprobada."', 'Carlos R. · MBA'],
          ['"La calma con la que me guió fue lo que más me ayudó. Nunca me sentí juzgada por mis dudas."', 'María F. · Maestría en Educación'],
          ['"Llevaba dos años estancado. En cuatro meses con Anita logré lo que no había podido en dos años."', 'Andrés P. · Maestría en Gestión Pública'],
        ].map(([q, a]) => (
          <div key={a} className="rounded-xl bg-salvia/50 p-4">
            <p className="font-display text-[15px] italic leading-snug text-olivo-prof">{q}</p>
            <p className="mt-2 text-xs text-piedra">{a}</p>
          </div>
        ))}
      </div>
    ),
  },
];
