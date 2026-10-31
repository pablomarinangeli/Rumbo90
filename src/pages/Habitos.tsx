import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HABITO_CAMPOS, describirFrecuencia, describirLimite, type Ciclo, type Habito } from '../lib/datos'
import { SUGERENCIAS, linkSugerencia } from '../lib/sugerencias'
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
  const [verIdeas, setVerIdeas] = useState<'construir' | 'reducir' | null>(null)

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

      <section className="mt-8 rounded-xl border border-slate-800 p-4">
        <h2 className="font-semibold">Ideas para sumar o dejar</h2>
        <p className="mt-1 text-sm text-slate-400">Tocá una idea para cargarla ya armada. Después la ajustás a tu medida.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {(
            [
              ['construir', 'Hábitos para sumar', 'border-emerald-500 text-emerald-400'],
              ['reducir', 'Hábitos para dejar', 'border-rose-400 text-rose-300'],
            ] as const
          ).map(([t, etiqueta, activa]) => (
            <button
              key={t}
              onClick={() => setVerIdeas((v) => (v === t ? null : t))}
              className={`rounded-lg border px-3 py-2 ${verIdeas === t ? `${activa} font-semibold` : 'border-slate-700 text-slate-400'}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {verIdeas && (
          <ul className="mt-3 space-y-2">
            {SUGERENCIAS.filter(
              (x) => x.tipo === verIdeas && !habitos.some((h) => h.titulo.toLowerCase() === x.titulo.toLowerCase()),
            ).map((x) => (
              <li key={x.titulo}>
                <Link to={linkSugerencia(x)} className="block rounded-lg border border-slate-800 p-3 active:bg-slate-900">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{x.titulo}</span>
                    <span className="shrink-0 text-xs text-slate-500">{x.area}</span>
                  </span>
                  <span className="block text-sm text-slate-400">{x.porque}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
