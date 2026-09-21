# Gym Platform

Plataforma web multi-gimnasio: cada gimnasio (tenant) tiene sus propios
socios, profesores, horarios, planes de entrenamiento y branding, aislados
por `gym_id` en una única base de Supabase compartida.

Primer gimnasio: **Forge Fitness Club**.

## Stack

- Frontend: HTML/CSS/JS plano organizado con [Vite](https://vitejs.dev/) (sin framework).
- Backend: [Supabase](https://supabase.com/) (Postgres + Auth + RLS).
- Hosting: Cloudflare Pages (permite conectar el dominio propio de cada
  gimnasio al mismo deploy).

## 1. Proyecto en Supabase

El proyecto ya está creado. Las credenciales se pasan por variables de
entorno de Vite (`.env.local`, no se sube a git). Para recrearlo en otra
máquina, copiá `.env.example` a `.env.local` y completá los valores desde
**Project Settings > API** en el dashboard de Supabase.

El esquema de base de datos vive versionado en
[`supabase/migrations`](supabase/migrations), en orden:

1. `0001_init_schema.sql` — tablas `gyms` y `profiles`, roles
   (`admin`/`profe`/`socio`), y políticas RLS que aíslan todo por `gym_id`.
2. `0002_seed_forge.sql` — alta del gimnasio Forge Fitness Club con su
   paleta de marca.

## 2. Correrlo localmente

```bash
npm install
npm run dev
```

En local, como no hay un dominio propio, la app elige el gimnasio a
mostrar por query param (`?gym=forge`) o, si no se especifica, usa
`VITE_DEV_GYM_SLUG` de `.env.local`.

## 3. Publicarlo (Cloudflare Pages)

1. En [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Pages** → **Connect to Git**, elegí el repo
   `contenidosmaccio/gym`.
2. Build settings: framework preset **Vite**, build command `npm run build`,
   output directory `dist`.
3. En **Settings > Environment variables** (para el entorno de Production,
   y también Preview si lo usás) agregá las mismas claves de
   `.env.example` con los valores reales:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_PLATFORM_DOMAIN`
4. Deploy. Cloudflare te da una URL `*.pages.dev` que ya sirve para probar
   la plataforma online.
5. Para el dominio propio de cada gimnasio (ej. `forgefitness.com.ar`):
   **Custom domains** en ese mismo proyecto de Pages → agregar dominio →
   seguir las instrucciones de DNS. Repetir por cada gimnasio nuevo; todos
   apuntan al mismo deploy y `tenant.js` resuelve cuál mostrar.

## Cómo funciona el multi-tenant

- Cada fila de `gyms` tiene un `slug` (para subdominios de la plataforma,
  ej. `forge.plataformagym.com.ar`) y opcionalmente un `domain` propio
  (ej. `forgefitness.com.ar`).
- Al cargar la página, `src/lib/tenant.js` resuelve el gimnasio según el
  hostname actual y aplica su branding (colores, nombre, favicon) como
  variables CSS.
- Todas las tablas de datos (perfiles, y las que se agreguen: ejercicios,
  horarios, planes, etc.) llevan `gym_id` y están protegidas con RLS para
  que un usuario de un gimnasio nunca pueda leer ni modificar datos de
  otro, sin importar qué URL o parámetro use.

## Roles

- **admin**: gestión completa del gimnasio (socios, profes, horarios,
  branding, precios).
- **profe**: seguimiento deportivo (rutinas y planes de sus socios).
- **socio**: consulta su plan, registra su entrenamiento, ve su cuota.

El registro es libre (el socio crea su cuenta) y queda en estado
`pending` hasta que un admin lo valida y lo pasa a `active`.

## Estado del proyecto

Este es un MVP en construcción por etapas. Lo que ya funciona:
arquitectura multi-tenant, resolución de branding por dominio, y
login/registro/logout con roles. El resto de los módulos (horarios,
biblioteca de ejercicios, planes y rutinas, cuotas, novedades, etc.) se
van agregando incrementalmente.
