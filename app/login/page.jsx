'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSb, usuarioAEmail } from '@/lib/supabase';
import { LogoAM } from '@/components/Ui';

export default function Login() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getSb();
      const { data } = await sb.auth.getSession();
      if (data.session) {
        const { data: esAdmin } = await sb.rpc('is_admin');
        router.replace(esAdmin ? '/admin' : '/portal');
      }
    })();
  }, [router]);

  async function entrar(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    const sb = getSb();
    const email = usuario.includes('@') ? usuario.trim() : usuarioAEmail(usuario);
    const { error: err } = await sb.auth.signInWithPassword({ email, password: clave });
    if (err) {
      setCargando(false);
      setError('Usuario o clave incorrectos.');
      return;
    }
    const { data: esAdmin } = await sb.rpc('is_admin');
    router.replace(esAdmin ? '/admin' : '/portal');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm px-8 py-10 text-center">
        <div className="mb-1 flex justify-center"><LogoAM size={44} /></div>
        <p className="font-display text-xl font-semibold">Anita Mishel</p>
        <p className="mb-8 text-sm text-olivo-prof">Tu espacio de trabajo</p>

        <form onSubmit={entrar} className="text-left">
          <div className="mb-4">
            <label className="lbl" htmlFor="u">Usuario o correo</label>
            <input id="u" className="field" value={usuario} onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username" required placeholder="tu usuario" />
          </div>
          <div className="mb-5">
            <label className="lbl" htmlFor="c">Clave</label>
            <input id="c" type="password" className="field" value={clave} onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password" required placeholder="tu clave" />
          </div>
          {error && <p className="mb-4 text-center text-sm text-red-700">{error}</p>}
          <button className="btn-olivo w-full" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <Link href="/" className="mt-6 inline-block text-xs text-piedra transition hover:text-olivo">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
