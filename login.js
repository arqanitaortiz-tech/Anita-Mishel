/* ============================================================
   LOGIN DEL CLIENTE — Anita Mishel (conectado a Supabase)
   ------------------------------------------------------------
   El cliente entra con su USUARIO y CLAVE. Internamente se
   traduce el usuario a un correo y se usa el login seguro de
   Supabase Auth. La sesión la maneja Supabase.
   ============================================================ */

const form  = document.getElementById('loginForm');
const error = document.getElementById('loginError');
const btn   = form.querySelector('button[type="submit"]');

// Si ya hay sesión activa, pasar directo al dashboard
(async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) window.location.href = 'cliente.html';
})();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;

    const usuario = document.getElementById('usuario').value.trim();
    const clave   = document.getElementById('clave').value;

    if (!usuario || !clave) return;

    btn.disabled = true;
    btn.textContent = 'Ingresando...';

    const { error: err } = await sb.auth.signInWithPassword({
        email: usuarioAEmail(usuario),
        password: clave
    });

    btn.disabled = false;
    btn.textContent = 'Ingresar';

    if (err) {
        error.textContent = 'Usuario o clave incorrectos.';
        error.hidden = false;
        return;
    }

    window.location.href = 'cliente.html';
});
