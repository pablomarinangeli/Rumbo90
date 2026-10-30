import { useAuth } from '../lib/auth'

const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const instalada = window.matchMedia('(display-mode: standalone)').matches

export default function Ajustes() {
  const { session, salir } = useAuth()
  const email = session?.user.email

  return (
    <div>
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <section className="mt-6 rounded-xl border border-slate-800 p-4">
        <h2 className="font-semibold">Cuenta</h2>
        <p className="mt-1 text-sm text-slate-400">{email}</p>
        <button onClick={() => void salir()} className="mt-3 text-sm text-red-400">
          Cerrar sesión
        </button>
      </section>

      {!instalada && (
        <section className="mt-4 rounded-xl border border-slate-800 p-4">
          <h2 className="font-semibold">Instalar la app</h2>
          {esIOS ? (
            <p className="mt-1 text-sm text-slate-400">
              En Safari tocá Compartir y luego “Agregar a inicio”. Es necesario para recibir recordatorios en
              iPhone (iOS 16.4 o posterior).
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
              En Chrome o Samsung Internet abrí el menú y elegí “Instalar aplicación” o “Agregar a pantalla de
              inicio”.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
