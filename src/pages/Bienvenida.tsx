import { useState } from 'react'
import { importarPlantilla } from '../lib/importarPlantilla'
import { cicloEjemplo, cicloVacio } from '../plantillas'
import type { PlantillaCiclo } from '../plantillas/tipos'

export default function Bienvenida({ alCrear }: { alCrear: () => void }) {
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const crear = async (plantilla: PlantillaCiclo) => {
    setCreando(true)
    setError(null)
    try {
      await importarPlantilla(plantilla)
      alCrear()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCreando(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Empecemos tu ciclo</h1>
      <p className="mt-2 text-slate-400">Elegí cómo arrancar. Después vas a poder ajustar metas y hábitos.</p>
      <div className="mt-6 space-y-3">
        <button
          disabled={creando}
          onClick={() => void crear(cicloEjemplo())}
          className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-left disabled:opacity-50"
        >
          <span className="font-semibold">Ciclo de 90 días con ejemplos</span>
          <span className="mt-1 block text-sm text-slate-400">
            Metas y hábitos de ejemplo en salud, desarrollo personal y profesional, para completar con tus valores.
          </span>
        </button>
        <button
          disabled={creando}
          onClick={() => void crear(cicloVacio())}
          className="w-full rounded-xl border border-slate-700 p-4 text-left disabled:opacity-50"
        >
          <span className="font-semibold">Ciclo vacío de 90 días</span>
          <span className="mt-1 block text-sm text-slate-400">
            Las tres dimensiones, sin metas. Ideal si es tu primera vez.
          </span>
        </button>
      </div>
      {creando && <p className="mt-4 text-sm text-slate-400">Creando tu ciclo…</p>}
      {error && <p className="mt-4 text-sm text-red-400">No se pudo crear el ciclo: {error}</p>}
    </div>
  )
}
