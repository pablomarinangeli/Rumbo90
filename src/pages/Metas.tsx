import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarraAvance } from '../components/ui'
import { calcularAvance } from '../lib/avance'
import { OBJETIVO_CAMPOS, type Ciclo, type Dimension, type Hito, type Medicion, type Objetivo } from '../lib/datos'
import { supabase } from '../lib/supabase'

export default function Metas({ ciclo }: { ciclo: Ciclo }) {
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [hitos, setHitos] = useState<Hito[]>([])
  const [conHabitos, setConHabitos] = useState<Set<string> | null>(null)

  useEffect(() => {
    void (async () => {
      const [d, o] = await Promise.all([
        supabase.from('dimensiones').select('id, nombre, orden').eq('ciclo_id', ciclo.id).order('orden'),
        supabase.from('objetivos').select(OBJETIVO_CAMPOS).eq('ciclo_id', ciclo.id).order('created_at'),
      ])
      setDimensiones(d.data ?? [])
      const objs = (o.data ?? []) as Objetivo[]
      setObjetivos(objs)
      const ids = objs.map((x) => x.id)
      if (!ids.length) return
      const [m, h, v] = await Promise.all([
        supabase.from('mediciones').select('id, objetivo_id, fecha, valor, unidad, nota').in('objetivo_id', ids),
        supabase.from('hitos').select('id, objetivo_id, titulo, fecha, estado, orden').in('objetivo_id', ids),
        supabase.from('habitos_objetivos').select('objetivo_id').in('objetivo_id', ids),
      ])
      setConHabitos(new Set((v.data ?? []).map((x) => x.objetivo_id as string)))
      setMediciones(m.data ?? [])
      setHitos(h.data ?? [])
    })()
  }, [ciclo.id])

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis metas</h1>
      <Link to="/coach" className="mt-4 block rounded-xl border border-violet-400/40 bg-violet-400/5 p-4 active:bg-violet-400/10">
        <span className="font-semibold">🤖 Armar mis metas con el coach</span>
        <span className="block text-sm text-slate-400">Contale tu situación y negocien juntos qué metas y hábitos trabajar.</span>
      </Link>
      {dimensiones.map((d) => {
        const propios = objetivos.filter((o) => o.dimension_id === d.id)
        return (
          <section key={d.id} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">{d.nombre}</h2>
            <ul className="mt-2 space-y-2">
              {propios.map((o) => {
                const avance = calcularAvance(
                  o,
                  mediciones.filter((m) => m.objetivo_id === o.id),
                  hitos.filter((h) => h.objetivo_id === o.id),
                )
                return (
                  <li key={o.id}>
                    <Link to={`/metas/${o.id}`} className="block rounded-xl border border-slate-800 p-4 active:bg-slate-900">
                      <p className="font-medium">{o.titulo}</p>
                      <p className="mt-1 text-sm text-slate-400">{avance.detalle}</p>
                      {conHabitos && !conHabitos.has(o.id) && (
                        <p className="mt-1 text-xs text-violet-300">💡 Sin hábitos todavía: tocá para ver sugerencias</p>
                      )}
                      <div className="mt-3">
                        <BarraAvance valor={avance.porcentaje} />
                      </div>
                    </Link>
                  </li>
                )
              })}
              <li>
                <Link to={`/metas/nueva?dimension=${d.id}`} className="block py-2 text-sm text-emerald-400">
                  + Agregar meta
                </Link>
              </li>
            </ul>
          </section>
        )
      })}
    </div>
  )
}
