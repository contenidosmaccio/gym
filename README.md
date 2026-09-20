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

El proyecto ya está creado. `config.js` (no se sube a git) tiene la URL y
la publishable key. Para recrearlo en otra máquina, copiá
`config.example.js` a `config.js` y completá los valores desde
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
`DEV_GYM_SLUG` de `config.js`.

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
