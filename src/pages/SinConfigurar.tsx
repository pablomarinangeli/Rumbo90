export default function SinConfigurar() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Falta configurar Supabase</h1>
      <p className="mt-4 text-slate-400">
        Copiá <code>.env.example</code> a <code>.env.local</code> y completá <code>VITE_SUPABASE_URL</code> y{' '}
        <code>VITE_SUPABASE_ANON_KEY</code>. Los pasos están en <code>docs/puesta-en-marcha.md</code>.
      </p>
    </div>
  )
}
