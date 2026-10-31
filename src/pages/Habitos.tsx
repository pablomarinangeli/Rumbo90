import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HABITO_CAMPOS, describirFrecuencia, type Ciclo, type Habito } from '../lib/datos'
import { supabase } from '../lib/supabase'

export default function Habitos({ ciclo }: { ciclo: Ciclo }) {
  const [habitos, setHabitos] = useState<Habito[]>([])

  useEffect(() => {
    supabase
      .from('habitos')
      .select(HABITO_CAMPOS)
      .eq('ciclo_id', ciclo.id)
      .order('hora', { nullsFirst: false })
      .then(({ data }) => setHabitos((data ?? []) as Habito[]))
  }, [ciclo.id])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis hábitos</h1>
        <Link to="/habitos/nuevo" className="text-sm font-semibold text-emerald-400">
          + Nuevo
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-400">Lo que hacés para conseguir tus metas. Cada hábito arma tus compromisos de Hoy.</p>
      <ul className="mt-6 space-y-2">
        {habitos.map((h) => (
          <li key={h.id}>
            <Link
              to={`/habitos/${h.id}`}
              className={`flex items-start gap-3 rounded-xl border border-slate-800 p-4 active:bg-slate-900 ${h.activo ? '' : 'opacity-50'}`}
            >
              <span className="w-12 shrink-0 pt-0.5 text-sm tabular-nums text-slate-500">{h.hora?.slice(0, 5) ?? '—'}</span>
              <span>
                <span className="block font-medium">{h.titulo}</span>
                <span className="block text-sm text-slate-400">
                  {describirFrecuencia(h.frecuencia)}
                  {!h.activo && ' · pausado'}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {habitos.length === 0 && (
          <li className="text-slate-500">
            Todavía no tenés hábitos. <Link to="/habitos/nuevo" className="text-emerald-400">Creá el primero</Link>.
          </li>
        )}
      </ul>
    </div>
  )
}
