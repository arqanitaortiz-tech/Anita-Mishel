import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-linea">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5">
            <svg viewBox="0 0 140 64" height="30" aria-label="Anita Mishel">
              <path d="M22 50 L40 12 L58 50" fill="none" stroke="#141F17" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="30" y1="36" x2="50" y2="36" stroke="#141F17" strokeWidth="6" strokeLinecap="round" />
              <path d="M68 50 V12 L93 40 L118 12 V50" fill="none" stroke="#6B7B5E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-tight">Anita Mishel</span>
          </span>
          <Link href="/login" className="btn-tinta">Iniciar sesión</Link>
        </div>
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-olivo-prof">
            Asesoría académica · Ecuador
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Tu tesis avanza,<br />
            <span className="text-olivo">tu vida no se detiene</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-piedra">
            Acompañamiento personalizado para profesionales que estudian una carrera
            universitaria o maestría mientras trabajan a tiempo completo.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/593981347078?text=Hola%20Anita,%20me%20interesa%20tu%20asesor%C3%ADa%20de%20tesis"
              target="_blank" rel="noopener noreferrer" className="btn-olivo"
            >
              Escribir por WhatsApp
            </a>
            <Link href="/login" className="btn-ghost">Área de clientes</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-linea py-6 text-center text-xs text-piedra">
        Arq. Urb. Anita Mishel · Asesoría Académica · Ecuador
      </footer>
    </main>
  );
}
