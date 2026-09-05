# Guía técnica: migrar un sitio estático (HTML) a una plataforma React

> **Para qué sirve este documento.** Es la "receta" completa que usamos para convertir un sitio HTML estático en una plataforma web con login, panel de administración, base de datos y correos automáticos. Está pensada para pegarla en un chat nuevo y que Claude la ejecute paso a paso en otro proyecto (por ejemplo, replicar la migración en un sitio distinto).
>
> **Cómo usarla:** pégala al inicio del chat nuevo y di *"Vamos a hacer esta migración, empecemos por la Fase 0, paso a paso, confirmando cada paso conmigo antes de escribir código."*

---

## 0. Reglas de trabajo (léelas primero)

Estas reglas son las que hacen que el proceso salga bien sin romper nada:

1. **Ir por fases, paso a paso.** Antes de sugerir el siguiente paso, confirmar que el anterior ya quedó resuelto.
2. **Preguntar antes de escribir código.** Siempre preguntar *"¿listo para ejecutar?"* y si hay algo más que considerar, antes de crear o modificar archivos.
3. **Respuestas simples y en español.** El dueño no es programador; explicar en lenguaje claro, sin tecnicismos innecesarios.
4. **Nunca pegar claves secretas en el chat.** El dueño las ingresa él mismo en el panel (Vercel/Supabase). Ver la sección de Seguridad.
5. **La migración a producción debe ser aditiva.** Nunca borrar ni alterar los datos reales que ya existan (clientes, usuarios, registros).

---

## 1. Qué se va a construir (arquitectura general)

Una sola aplicación **Next.js** (React) que reemplaza al HTML estático, con tres piezas:

- **Front page pública** — la cara del negocio (hero, secciones, botones de contacto/registro).
- **Panel de administración** — acceso privado para el dueño: dashboard, gestión de usuarios/registros, base de datos.
- **Portal de usuario** — acceso privado para cada cliente/usuario final (según el negocio).

Todo se apoya en:

- **Supabase** como backend (base de datos + login + almacenamiento de archivos).
- **Vercel** como hosting (despliegue automático desde GitHub).
- **Correo SMTP** (Zoho u otro) para notificaciones automáticas.

```
Navegador
   │
   ├─ Front page pública      (Next.js / React)
   ├─ /login                  (email + clave → Supabase Auth)
   ├─ /admin                  (privado: dueño)
   └─ /portal                 (privado: usuario)
                                   │
                                   ▼
                            Supabase (Postgres + Auth + Storage)
                                   │
                            Correos vía SMTP (rutas /api en el servidor)
```

---

## 2. Stack tecnológico (versiones probadas)

| Pieza | Tecnología | Nota |
|---|---|---|
| Framework | **Next.js 14** (App Router) | React 18 |
| Estilos | **Tailwind CSS 3** | colores de marca personalizados |
| Base de datos / Auth / Storage | **Supabase** | Postgres + RLS + Auth email/clave |
| Hosting | **Vercel** | 2 proyectos sobre el mismo repo (dev y producción) |
| Correo | **Nodemailer + SMTP** (Zoho `smtppro.zoho.com:465`) | requiere plan de correo con SMTP |
| PDF (si aplica) | **pdf-lib** | contratos/documentos generados |
| Excel (si aplica) | **SheetJS (xlsx)** | exportar tablas |
| Iconos | **Tabler Icons** (webfont) | |
| Tipografías | Google Fonts (elegir 2–3) | |

`package.json` de referencia (dependencias base):

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "next": "^14.2.5",
    "nodemailer": "^6.9.14",
    "pdf-lib": "^1.17.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6"
  }
}
```

---

## 3. Estructura de carpetas

```
proyecto/
├── app/
│   ├── layout.jsx            # layout raíz, fuentes, metadatos
│   ├── page.jsx             # front page pública
│   ├── login/page.jsx        # inicio de sesión
│   ├── admin/page.jsx        # panel del dueño (menú lateral)
│   ├── portal/page.jsx       # portal del usuario
│   └── api/
│       ├── notificar/route.js  # envío de correos (eventos)
│       └── (otras rutas)/route.js
├── components/
│   └── (componentes reutilizables, ej. Calendario.jsx)
├── lib/
│   ├── supabase.js           # ÚNICA fuente de conexión a Supabase
│   ├── mailer.js             # configuración de SMTP (solo servidor)
│   └── (lógica de negocio: horario.js, etc.)
├── public/                   # imágenes, logos, QR
├── tailwind.config.js        # colores de marca
├── package.json
└── .env.local                # variables locales (NO se sube a GitHub)
```

**Regla de oro:** un solo archivo `lib/supabase.js` centraliza la conexión. Nunca crear el cliente de Supabase en varios lugares.

---

## 4. Fases de ejecución

### Fase 0 — Preparación de cuentas y repo

1. Crear repositorio en **GitHub** (puede empezar privado; si Vercel Hobby bloquea el deploy por repo privado, hacerlo público o subir de plan).
2. Crear proyecto en **Supabase** → anotar la *URL del proyecto* y la *anon/publishable key* (esta es pública, no pasa nada si se usa en el navegador).
3. Crear cuenta en **Vercel** conectada a GitHub.
4. Tener listo un correo con **SMTP** habilitado (Zoho Workplace Standard u otro).

### Fase 1 — Migración base y diseño

1. Inicializar Next.js 14 con Tailwind.
2. Definir la **identidad visual** en `tailwind.config.js` (paleta de colores con nombres propios, ej. `tinta`, `papel`, acento) y las fuentes en `layout.jsx`.
3. Reconstruir la **front page** como componente React, tomando textos e imágenes del sitio HTML original. Aquí es donde se decide el esquema visual (una sola pantalla, secciones, etc.).
4. Desplegar en Vercel para ver la versión de desarrollo funcionando.

### Fase 2 — Supabase (base de datos, login, storage)

1. **Esquema de tablas** según el negocio. Patrón típico:
   - `usuarios`/`clientes` (datos del usuario final)
   - tablas de actividad (registros, movimientos, citas, etc.)
   - `admins` (lista de UIDs con permiso de administrador)
2. **Auth email/clave.** Para no pedir correos reales se pueden usar correos sintéticos internos, ej. `usuario@clientes.midominio.com`, y guardar el nombre de usuario aparte.
3. **Función `is_admin()`** (security-definer) que revisa si el UID autenticado está en la tabla `admins`.
4. **RLS (Row Level Security) en TODAS las tablas.** Reglas típicas:
   - El usuario solo ve/edita **sus** filas (`auth.uid() = user_id`).
   - El admin ve/edita todo (`is_admin()`).
   - Inserciones públicas (ej. formulario de contacto/registro): política `insert` para `anon`, **sin** `select` (importante: si la ruta hace `.insert().select()` y `anon` no tiene permiso de `select`, falla con *"violates row-level security policy"* → quitar el `.select()`).
5. **Storage bucket** (ej. `documentos`) para archivos subidos (cédulas, PDFs, etc.), con sus políticas RLS.

### Fase 3 — Login + Panel de administración

1. `/login`: formulario email + clave → `supabase.auth.signInWithPassword`.
2. Tras login, redirigir según rol (admin → `/admin`, usuario → `/portal`).
3. `/admin`: **menú lateral** con secciones: Resumen (dashboard con KPIs), gestión de usuarios/registros, base de datos (tabla con filtros y exportación a Excel).
4. Proteger las rutas: si no hay sesión o no es admin, redirigir a `/login`.

### Fase 4 — Portal del usuario

1. `/portal`: el usuario ve **solo su información** (su progreso, sus documentos, sus movimientos).
2. Acciones que el usuario puede hacer (según negocio): subir datos, solicitar algo, ver su historial.
3. Todo filtrado por RLS: el usuario nunca ve datos de otros.

### Fase 5 — Correos automáticos

1. `lib/mailer.js`: configura Nodemailer con SMTP. **Solo se usa en el servidor** (rutas `/api`), nunca en el navegador.
2. `app/api/notificar/route.js`: recibe un tipo de evento y envía el correo correspondiente (confirmaciones, avisos, etc.).
3. **Zona horaria:** formatear fechas con la zona local del país (ej. `timeZone: 'America/Guayaquil'`) para que los correos no muestren la hora en UTC.
4. Los datos de acceso al correo van en **variables de entorno** (`ZOHO_USER`, `ZOHO_PASS`), nunca en el código.

### Fase 6 — Funciones extra (según el negocio)

Patrones ya probados que se pueden reutilizar:
- **Generación de PDF** (contratos, comprobantes) con `pdf-lib`, incluyendo firma dibujada por el usuario.
- **Pagos/abonos** con barra de progreso auto-calculada (total = anticipo + abonos).
- **Calendario / agenda** con franjas horarias, bloqueos y estados (pendiente/confirmada/realizada/cancelada).
- **Base de datos exportable** a Excel con filtros por estado y por fecha.

### Fase 7 — Despliegue en Vercel (dev + producción)

1. **Dos proyectos de Vercel sobre el mismo repositorio**, cada uno siguiendo una rama distinta:
   - Proyecto **desarrollo** → rama `next` (o `dev`).
   - Proyecto **producción** → rama `main`.
2. En cada proyecto configurar las **variables de entorno**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_KEY` (anon/publishable, pública)
   - `ZOHO_USER`, `ZOHO_PASS` (secretas → las ingresa el dueño en el panel)
3. Framework preset: **Next.js**.
4. Con cada `git push`, Vercel despliega automáticamente. Si algo sale mal, usar **Instant Rollback** para volver a la versión anterior.

### Fase 8 — Transición de desarrollo a producción (¡aditiva!)

1. **Nunca** borrar datos reales existentes. Si el proyecto de producción ya tiene usuarios/clientes, se conservan tal cual.
2. Verificar que la versión nueva **apunte al Supabase correcto** (por variables de entorno).
3. Migrar el código de la rama `next` a `main` de forma **no destructiva** (ej. `git checkout next -- .` y luego commit, en vez de un force-push que borre historial).
4. Verificar el dominio en vivo. Recién ahí retirar el proyecto/sitio viejo.

---

## 5. Seguridad y credenciales (crítico)

- **Claves públicas (safe):** la *anon / publishable key* de Supabase y la URL del proyecto pueden ir en el navegador y en el código. Están diseñadas para eso.
- **Claves secretas (NUNCA exponer):** la `service_role` de Supabase y la contraseña del correo (`ZOHO_PASS`). Van **solo** en variables de entorno del panel de Vercel/Supabase, y **el dueño las ingresa personalmente**. No pegarlas en el chat.
- **RLS siempre activa.** Ninguna tabla debe quedar sin Row Level Security en producción.
- **`.env.local` nunca se sube a GitHub** (agregarlo al `.gitignore`).

---

## 6. Errores comunes ya resueltos (y su solución)

| Síntoma | Causa | Solución |
|---|---|---|
| *"new row violates row-level security policy"* al insertar desde formulario público | La ruta hace `.insert().select()` y `anon` no tiene permiso de `select` | Quitar el `.select()` de la inserción |
| Login SMTP 422 *"email_provider_disabled"* | Proveedor de correo apagado en Supabase | Activar el proveedor; luego apagar *"Confirm email"* si aparece error de rate limit |
| Correos muestran la hora en UTC (desfasada) | Formateo sin zona horaria | Agregar `timeZone: 'America/Guayaquil'` (o la del país) al formatear fechas |
| El anticipo/pago inicial no cuenta en la barra | Se sumaban solo los abonos | Calcular pagado = anticipo + abonos |
| Vercel bloquea el deploy | Repo privado en plan Hobby o autor del commit no es miembro | Hacer el repo público o ajustar membresía |
| Un commit revierte la página a una versión vieja | Push accidental | Restaurar desde el archivo correcto y re-desplegar; usar Instant Rollback |

---

## 7. Checklist final antes de lanzar

- [ ] Front page se ve bien en escritorio **y** en móvil.
- [ ] Login funciona y redirige según rol (admin/usuario).
- [ ] Admin ve el dashboard, la base de datos y puede exportar.
- [ ] Usuario ve solo su información (RLS verificada con dos cuentas distintas).
- [ ] Correos automáticos llegan con la hora correcta.
- [ ] Variables de entorno configuradas en producción (Supabase URL/key + correo).
- [ ] Datos reales existentes intactos (migración aditiva).
- [ ] Textos legales listos (Términos, Privacidad, Cookies) — no dejar en `#`.
- [ ] Dominio en vivo verificado; sitio viejo retirado.

---

## 8. Cómo aplicar esto a un proyecto nuevo (resumen para el chat)

1. Pega esta guía en el chat nuevo.
2. Describe el negocio y sus funciones (qué hace el usuario, qué hace el admin).
3. Adapta el **esquema de tablas** de la Fase 2 a esas funciones.
4. Sigue las fases 0 → 8 en orden, confirmando cada paso.
5. Respeta siempre las reglas de trabajo (sección 0) y de seguridad (sección 5).

> Esta guía describe **el método y el stack**. Las funciones concretas (roles, formularios, cálculos) se definen al inicio del proyecto nuevo y se mapean sobre estas mismas fases.
