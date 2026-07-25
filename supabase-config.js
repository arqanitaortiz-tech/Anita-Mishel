/* ============================================================
   CONFIGURACIÓN DE SUPABASE — Anita Mishel
   ------------------------------------------------------------
   Estas claves son PÚBLICAS (diseñadas para ir en el navegador).
   La seguridad real la dan las reglas (RLS) en Supabase.
   NUNCA pongas aquí la clave "service_role" / "secret".
   ============================================================ */

const SUPABASE_URL = 'https://ofijlvlbwjlulrgamjiy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1tyeTVnL4Fq7NK638OMmTQ_SC9IyAHZ';

// Dominio interno para armar el "correo" a partir del usuario.
// El cliente nunca lo ve: entra solo con su usuario y clave.
const DOMINIO_INTERNO = 'clientes.anitamishel.com';

// Cliente principal de Supabase (sesión persistente)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Convierte un usuario en el correo interno que usa Supabase Auth
function usuarioAEmail(usuario) {
    return usuario.trim().toLowerCase() + '@' + DOMINIO_INTERNO;
}
