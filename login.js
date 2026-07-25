/* ============================================================
   LOGIN DEL CLIENTE — Anita Mishel
   ------------------------------------------------------------
   TEMPORAL: valida contra los clientes guardados en el
   navegador (localStorage) por el panel de admin. Sin backend
   todavía, así que NO es seguro. La sesión se guarda en
   sessionStorage. Se reemplaza al conectar la base de datos.
   ============================================================ */

const STORAGE_KEY = 'anita_clientes';
const SESSION_KEY = 'anita_sesion';

const form  = document.getElementById('loginForm');
const error = document.getElementById('loginError');

function cargarClientes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    error.hidden = true;

    const usuario = document.getElementById('usuario').value.trim();
    const clave   = document.getElementById('clave').value;

    const clientes = cargarClientes();
    const cliente = clientes.find(c =>
        c.usuario.toLowerCase() === usuario.toLowerCase() && c.clave === clave
    );

    if (!cliente) {
        error.hidden = false;
        return;
    }

    // Guardar sesión (solo el id) y entrar
    sessionStorage.setItem(SESSION_KEY, cliente.id);
    window.location.href = 'cliente.html';
});
