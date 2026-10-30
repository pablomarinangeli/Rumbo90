# Puesta en marcha

Rumbo 90 corre como web app en la nube: **Supabase** (base de datos y login con Google) y **Vercel** (hosting con HTTPS). Ambos tienen plan gratuito.

## 1. Supabase

1. Crear un proyecto en <https://supabase.com/dashboard> (región sugerida: São Paulo).
2. En **Project Settings → Integrations → GitHub**, conectar el repositorio con *Working directory* `.`, activar **Deploy to production** y poner `main` como *Production branch*. Cada merge a `main` aplica las migraciones de `supabase/migrations`.
   - No ejecutar esas migraciones a mano en el SQL Editor: la integración intentaría aplicarlas de nuevo y fallaría.
3. En **Project Settings → API**, copiar `Project URL` y la clave `anon public`.

## 2. Login con Google

1. En <https://console.cloud.google.com/apis/credentials> crear un proyecto y una credencial **OAuth client ID** de tipo *Web application*.
   - Si lo pide, configurar la pantalla de consentimiento como *External* y agregar tu email y el de tu amigo como usuarios de prueba (o publicarla).
2. En **Authorized redirect URIs** agregar la URL de callback que muestra Supabase en **Authentication → Sign In / Providers → Google** (tiene la forma `https://<proyecto>.supabase.co/auth/v1/callback`).
3. Copiar el *Client ID* y el *Client secret* en ese mismo proveedor de Google en Supabase y activarlo.
4. En **Authentication → URL Configuration**, poner como *Site URL* la dirección de Vercel (paso 3) y agregar `http://localhost:5173` en *Redirect URLs* para desarrollo.

## 3. Vercel

1. En <https://vercel.com/new> importar el repositorio `Rumbo90` (framework: Vite).
2. Cargar las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Cada push a `main` publica una nueva versión.

## 4. Instalar en el teléfono

- **Android (Samsung):** abrir la URL en Chrome o Samsung Internet → menú → *Instalar aplicación*.
- **iPhone:** abrir la URL en Safari → Compartir → *Agregar a inicio*. Las notificaciones en iPhone requieren iOS 16.4 o posterior y la app agregada a inicio.

## Desarrollo local

```bash
cp .env.example .env.local   # completar con los datos de Supabase
npm install
npm run dev
```
