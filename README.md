# Plataforma Anita Mishel (Next.js)

Migración de la página a plataforma. Fase 1: misma funcionalidad, nueva base e identidad.
Conectada por defecto al Supabase de DESARROLLO (anita-dev) — datos de prueba.

## Probar en tu computadora
1. Instalar Node.js (nodejs.org, versión LTS) si no lo tienes.
2. En esta carpeta, abrir una terminal y correr:
   npm install
   npm run dev
3. Abrir http://localhost:3000

## Accesos de prueba (anita-dev)
- Admin: correo admin@test.com y su clave (creados en Supabase anita-dev).
- Clientes: los que crees desde el panel /admin.

## Subir a GitHub (rama next)
git checkout -b next
(copiar estos archivos a la raíz del repo, reemplazando lo anterior SOLO en esta rama)
git add -A && git commit -m "Fase 1: migracion a Next.js" && git push -u origin next

## Publicar vista previa en Vercel
Crear un proyecto NUEVO en Vercel apuntando al mismo repo, rama `next`
(framework: Next.js, se detecta solo). Esa URL será la vista previa de la plataforma.
El sitio actual en producción no se toca.

## Lanzamiento (cuando todo esté aprobado)
En Vercel definir las variables de entorno:
- NEXT_PUBLIC_SUPABASE_URL  -> URL del Supabase REAL
- NEXT_PUBLIC_SUPABASE_KEY  -> clave publishable del Supabase REAL
y hacer merge de `next` a `main`.
