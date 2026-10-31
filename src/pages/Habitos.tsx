import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HABITO_CAMPOS, describirFrecuencia, describirLimite, type Ciclo, type Habito } from '../lib/datos'
import { supabase } from '../lib/supabase'

const SECCIONES = [
  {
    tipo: 'construir',
    titulo: 'Buenos: a construir',
    texto: 'Lo que hacés para conseguir tus metas. Arman tus compromisos de Hoy.',
    vacio: 'Todavía no tenés hábitos a construir.',
    color: 'text-emerald-400',
  },
  {
    tipo: 'reducir',
    titulo: 'Malos: a reducir o eliminar',
    texto: 'Lo que querés hacer cada vez menos. En Hoy registrás cada vez que pasa.',
    vacio: 'Todavía no cargaste hábitos a reducir.',
    color: 'text-rose-300',
  },
] as const

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
      <h1 className="text-2xl font-bold">Mis hábitos</h1>
      {SECCIONES.map((s) => {
        const lista = habitos.filter((h) => (h.tipo ?? 'construir') === s.tipo)
        return (
          <section key={s.tipo} className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className={`font-semibold ${s.color}`}>{s.titulo}</h2>
              <Link to={`/habitos/nuevo?tipo=${s.tipo}`} className={`text-sm font-semibold ${s.color}`}>
                + Nuevo
              </Link>
            </div>
            <p className="mt-1 text-sm text-slate-400">{s.texto}</p>
            <ul className="mt-3 space-y-2">
              {lista.map((h) => (
                <li key={h.id}>
                  <Link
                    to={`/habitos/${h.id}`}
                    className={`flex items-start gap-3 rounded-xl border border-slate-800 p-4 active:bg-slate-900 ${h.activo ? '' : 'opacity-50'}`}
                  >
                    {s.tipo === 'construir' && (
                      <span className="w-12 shrink-0 pt-0.5 text-sm tabular-nums text-slate-500">{h.hora?.slice(0, 5) ?? '—'}</span>
                    )}
                    <span>
                      <span className="block font-medium">{h.titulo}</span>
                      <span className="block text-sm text-slate-400">
                        {s.tipo === 'reducir' ? describirLimite(h.limite_semana) : describirFrecuencia(h.frecuencia)}
                        {!h.activo && ' · pausado'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {lista.length === 0 && <li className="text-sm text-slate-500">{s.vacio}</li>}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
