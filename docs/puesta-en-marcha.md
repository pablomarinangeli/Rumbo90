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
4. En **Authentication → URL Configuration**, poner como *Site URL* la dirección pública de la app (paso 3) y agregar `http://localhost:5173` en *Redirect URLs* para desarrollo.

## 3. Publicación en GitHub Pages

Cada push a `main` publica la app en <https://pablomarinangeli.github.io/Rumbo90/> mediante `.github/workflows/pages.yml`.

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. En **Settings → Secrets and variables → Actions**:
   - pestaña *Variables*: `VITE_SUPABASE_URL` = la URL del proyecto de Supabase.
   - pestaña *Secrets*: `VITE_SUPABASE_ANON_KEY` = la clave anon.
3. En Supabase, **Authentication → URL Configuration**: *Site URL* `https://pablomarinangeli.github.io/Rumbo90/` y la misma dirección en *Redirect URLs*.
4. Volver a correr el workflow (**Actions → Publicar en GitHub Pages → Run workflow**) o hacer un push a `main`.

## 3b. Alternativa: Vercel

1. En <https://vercel.com/new> importar el repositorio `Rumbo90` (framework: Vite).
2. Cargar las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Cada push a `main` publica una nueva versión.

## 4. Instalar en el teléfono

- **Android (Samsung):** abrir la URL en Chrome o Samsung Internet → menú → *Instalar aplicación*.
- **iPhone:** abrir la URL en Safari → Compartir → *Agregar a inicio*. Las notificaciones en iPhone requieren iOS 16.4 o posterior y la app agregada a inicio.

## 5. Coach con IA (opcional)

El coach corre en una Edge Function de Supabase (`supabase/functions/coach`). La clave de Anthropic queda guardada en Supabase y nunca llega al navegador.

1. **Clave de Anthropic:** en <https://console.anthropic.com> → *API Keys* → crear una clave, y cargar crédito en *Billing*.
2. **Secretos en Supabase:** *Edge Functions → Secrets* (o *Project Settings → Edge Functions*) y agregar:
   - `ANTHROPIC_API_KEY`: la clave del paso 1.
   - `COACH_EMAILS`: los mails de Google habilitados para usar el coach, separados por coma. Cualquier otra cuenta recibe "no habilitado", así nadie más gasta tu crédito.
3. **Token para publicar la función:** en Supabase, *Account → Access Tokens* → generar uno. En GitHub, *Settings → Secrets and variables → Actions → New repository secret* con el nombre `SUPABASE_ACCESS_TOKEN`.
4. **Publicar:** cada push a `main` que toque `supabase/functions/` corre el workflow *Publicar funciones de Supabase*. También se puede correr a mano desde *Actions*.

## Desarrollo local

```bash
cp .env.example .env.local   # completar con los datos de Supabase
npm install
npm run dev
```
