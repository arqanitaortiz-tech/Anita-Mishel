import { createClient } from '@supabase/supabase-js';

/* Conexión a Supabase.
   Por defecto apunta al proyecto de DESARROLLO (anita-dev).
   Al lanzar a producción, se definen las variables de entorno
   NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_KEY en Vercel
   con los valores del proyecto real — sin tocar el código. */

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://npjlenpcsyxoibolvoyt.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_LpKzUUDhHi-JZYxpgpwyqg_KUh6DFd0';

export const DOMINIO_INTERNO = 'clientes.anitamishel.com';

let _sb = null;
export function getSb() {
  if (!_sb) _sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

export function usuarioAEmail(usuario) {
  return usuario.trim().toLowerCase() + '@' + DOMINIO_INTERNO;
}

/* Cliente temporal para crear accesos sin tocar la sesión del admin */
export function makeTempClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sb-temp-signup' },
  });
}
