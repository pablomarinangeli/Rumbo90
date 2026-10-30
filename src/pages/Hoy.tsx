import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { diaDelCiclo, habitosDelDia, type Ciclo, type Habito } from '../lib/datos'

export default function Hoy({ ciclo }: { ciclo: Ciclo }) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const { dia, total } = diaDelCiclo(ciclo)
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    supabase
      .from('habitos')
      .select('id, titulo, frecuencia, hora, duracion_min, version_minima')
      .eq('ciclo_id', ciclo.id)
      .eq('activo', true)
      .then(({ data }) => setHabitos(data ?? []))
  }, [ciclo.id])

  const delDia = habitosDelDia(habitos)

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">{fecha}</p>
      <h1 className="mt-1 text-2xl font-bold">Mis compromisos</h1>
      <p className="mt-1 text-sm text-slate-400">
        Día {dia} de {total} · {ciclo.nombre}
      </p>

      <ul className="mt-6 space-y-2">
        {delDia.map((h) => (
          <li key={h.id} className="flex items-start gap-3 rounded-xl border border-slate-800 p-4">
            <span className="w-12 shrink-0 pt-0.5 text-sm tabular-nums text-slate-500">
              {h.hora?.slice(0, 5) ?? '—'}
            </span>
            <div>
              <p className="font-medium">{h.titulo}</p>
              {h.version_minima && (
                <p className="mt-0.5 text-sm text-slate-500">Versión mínima: {h.version_minima}</p>
              )}
            </div>
          </li>
        ))}
        {delDia.length === 0 && <li className="text-slate-500">No hay hábitos programados para hoy.</li>}
      </ul>

      <p className="mt-6 text-sm text-slate-500">
        Próximamente: marcar Realizado, Parcial, Pospuesto o No realizado, también sin conexión.
      </p>
    </div>
  )
}
