import { useAuth } from '../lib/auth'

export default function Login() {
  const { entrarConGoogle } = useAuth()
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-4xl font-bold">Rumbo 90</h1>
      <p className="mt-3 text-slate-400">
        No se trata de hacer más cosas. Se trata de cumplir sistemáticamente las acciones que producen
        los resultados que elegiste.
      </p>
      <button
        onClick={() => void entrarConGoogle()}
        className="mt-10 rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 active:bg-slate-200"
      >
        Entrar con Google
      </button>
    </div>
  )
}
