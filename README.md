# Rumbo 90

Aplicación personal de disciplina, hábitos y cumplimiento de objetivos, en ciclos de 30, 63 o 90 días.
PWA instalable en Android y iPhone, con login de Google y datos sincronizados en la nube.

- Especificación completa: [`docs/especificacion.md`](docs/especificacion.md)
- Cómo publicarla (Supabase + Google + Vercel): [`docs/puesta-en-marcha.md`](docs/puesta-en-marcha.md)

## Stack

React 19 + TypeScript + Vite · Tailwind CSS 4 · Supabase (PostgreSQL, Auth con Google, RLS) · vite-plugin-pwa · Vercel

## Estructura

```
src/
  App.tsx              rutas y control de sesión
  lib/                 cliente de Supabase, auth, consultas, importación de plantillas
  pages/               Hoy, Metas, Revisión, Ajustes, Login, Bienvenida
  plantillas/          ciclo de ejemplo y ciclo vacío
supabase/migrations/   esquema de base de datos con seguridad por usuario
```

## Comandos

```bash
npm run dev     # desarrollo en http://localhost:5173
npm run build   # build de producción
npm run lint
```
