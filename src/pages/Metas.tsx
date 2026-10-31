import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarraAvance } from '../components/ui'
import { calcularAvance } from '../lib/avance'
import {
  DIMENSION_CAMPOS,
  ESTADOS_CATEGORIA,
  OBJETIVO_CAMPOS,
  type Ciclo,
  type Dimension,
  type Hito,
  type Medicion,
  type Objetivo,
  type Subcategoria,
} from '../lib/datos'
import { inicioDeMes } from '../lib/equilibrio'
import { supabase } from '../lib/supabase'

export default function Metas({ ciclo }: { ciclo: Ciclo }) {
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [hitos, setHitos] = useState<Hito[]>([])
  const [conHabitos, setConHabitos] = useState<Set<string> | null>(null)
  const [evaluadoEsteMes, setEvaluadoEsteMes] = useState(true)
  const [verSinFoco, setVerSinFoco] = useState(false)

  useEffect(() => {
    void (async () => {
      const [d, o] = await Promise.all([
        supabase.from('dimensiones').select(DIMENSION_CAMPOS).eq('ciclo_id', ciclo.id).order('orden'),
        supabase.from('objetivos').select(OBJETIVO_CAMPOS).eq('ciclo_id', ciclo.id).order('created_at'),
      ])
      const dims = (d.data ?? []) as Dimension[]
      setDimensiones(dims)
      const objs = (o.data ?? []) as Objetivo[]
      setObjetivos(objs)
      const dimIds = dims.map((x) => x.id)
      if (dimIds.length) {
        const [s, e] = await Promise.all([
          supabase.from('subcategorias').select('id, dimension_id, nombre, orden').in('dimension_id', dimIds),
          supabase.from('evaluaciones_dimension').select('id').in('dimension_id', dimIds).eq('mes', inicioDeMes()).limit(1),
        ])
        setSubcategorias(s.data ?? [])
        setEvaluadoEsteMes((e.data ?? []).length > 0)
      }
      const ids = objs.map((x) => x.id)
      if (!ids.length) {
        setConHabitos(new Set())
        return
      }
      const [m, h, v] = await Promise.all([
        supabase.from('mediciones').select('id, objetivo_id, fecha, valor, unidad, nota').in('objetivo_id', ids),
        supabase.from('hitos').select('id, objetivo_id, titulo, fecha, estado, orden').in('objetivo_id', ids),
        supabase.from('habitos_objetivos').select('objetivo_id').in('objetivo_id', ids),
      ])
      setMediciones(m.data ?? [])
      setHitos(h.data ?? [])
      setConHabitos(new Set((v.data ?? []).map((x) => x.objetivo_id as string)))
    })()
  }, [ciclo.id])

  const conFoco = dimensiones.filter((d) => d.estado !== 'sin_foco')
  const sinFoco = dimensiones.filter((d) => d.estado === 'sin_foco')

  const seccion = (d: Dimension) => {
    const propios = objetivos.filter((o) => o.dimension_id === d.id)
    const estado = ESTADOS_CATEGORIA[d.estado ?? 'prioritaria']
    return (
      <section key={d.id} className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">{d.nombre}</h2>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${estado.clase}`}>{estado.nombre}</span>
        </div>
        <ul className="mt-2 space-y-2">
          {propios.map((o) => {
            const avance = calcularAvance(
              o,
              mediciones.filter((m) => m.objetivo_id === o.id),
              hitos.filter((h) => h.objetivo_id === o.id),
            )
            const sub = subcategorias.find((s) => s.id === o.subcategoria_id)
            return (
              <li key={o.id}>
                <Link to={`/metas/${o.id}`} className="block rounded-xl border border-slate-800 p-4 active:bg-slate-900">
                  {sub && <p className="text-xs text-slate-500">{sub.nombre}</p>}
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
          {propios.length === 0 && d.estado === 'mantenimiento' && (
            <li className="text-sm text-slate-500">En mantenimiento: alcanza con algún hábito mínimo para sostener lo logrado.</li>
          )}
          <li>
            <Link to={`/metas/nueva?dimension=${d.id}`} className="block py-2 text-sm text-emerald-400">
              + Agregar meta
            </Link>
          </li>
        </ul>
      </section>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis metas</h1>
      <Link to="/coach" className="mt-4 block rounded-xl border border-violet-400/40 bg-violet-400/5 p-4 active:bg-violet-400/10">
        <span className="font-semibold">🤖 Armar mis metas con el coach</span>
        <span className="block text-sm text-slate-400">Contale tu situación y negocien juntos qué metas y hábitos trabajar.</span>
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Link to="/equilibrio" className="rounded-xl border border-slate-800 p-3 text-center active:bg-slate-900">
          ⚖️ Rueda de la vida
        </Link>
        <Link to="/categorias" className="rounded-xl border border-slate-800 p-3 text-center active:bg-slate-900">
          🗂️ Categorías
        </Link>
      </div>

      {!evaluadoEsteMes && dimensiones.length > 0 && (
        <Link to="/equilibrio" className="mt-3 block rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
          📝 Evaluá tu mes: ¿qué tan satisfecho estás con cada área de tu vida? Lleva un minuto.
        </Link>
      )}

      {conFoco.map(seccion)}

      {sinFoco.length > 0 && (
        <section className="mt-8">
          <button onClick={() => setVerSinFoco((v) => !v)} className="w-full rounded-xl border border-dashed border-slate-700 p-3 text-left text-sm text-slate-400">
            Sin foco ahora: {sinFoco.map((d) => d.nombre).join(', ')} {verSinFoco ? '▲' : '▼'}
          </button>
          {verSinFoco && sinFoco.map(seccion)}
        </section>
      )}
    </div>
  )
}
