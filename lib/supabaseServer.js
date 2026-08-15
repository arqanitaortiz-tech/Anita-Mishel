/* Cliente de Supabase para las rutas del servidor, actuando en nombre
   del usuario que llama (su token viaja en el header Authorization).
   Las reglas RLS se siguen aplicando con normalidad. */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

export function sbDesdeRequest(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return { sb: null, token: null };
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { sb, token };
}

export async function usuarioDe(sb, token) {
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
