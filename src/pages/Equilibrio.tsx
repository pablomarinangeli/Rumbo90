import { useCallback, useEffect, useState } from 'react'
import Rueda from '../components/Rueda'
import { BotonPrimario } from '../components/ui'
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
} from '../lib/datos'
import { inicioDeMes, mesAnterior, nombreDelMes, type Evaluacion } from '../lib/equilibrio'
import { supabase } from '../lib/supabase'

export default function Equilibrio({ ciclo }: { ciclo: Ciclo }) {
  const mes = inicioDeMes()
  const anterior = mesAnterior(mes)
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [borrador, setBorrador] = useState<Record<string, number>>({})
  const [avances, setAvances] = useState<Record<string, number | null>>({})
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const cargar = useCallback(async () => {
    const [d, o] = await Promise.all([
      supabase.from('dimensiones').select(DIMENSION_CAMPOS).eq('ciclo_id', ciclo.id).order('orden'),
      supabase.from('objetivos').select(OBJETIVO_CAMPOS).eq('ciclo_id', ciclo.id),
    ])
    const dims = (d.data ?? []) as Dimension[]
    const objs = (o.data ?? []) as Objetivo[]
    setDimensiones(dims)
    const ids = objs.map((x) => x.id)
    const [e, m, h] = await Promise.all([
      supabase
        .from('evaluaciones_dimension')
        .select('id, dimension_id, mes, puntaje')
        .in('dimension_id', dims.map((x) => x.id))
        .in('mes', [mes, anterior]),
      ids.length ? supabase.from('mediciones').select('id, objetivo_id, fecha, valor, unidad, nota').in('objetivo_id', ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('hitos').select('id, objetivo_id, titulo, fecha, estado, orden').in('objetivo_id', ids) : Promise.resolve({ data: [] }),
    ])
    const evs = (e.data ?? []) as Evaluacion[]
    setEvaluaciones(evs)
    setBorrador(Object.fromEntries(dims.map((x) => [x.id, evs.find((v) => v.dimension_id === x.id && v.mes === mes)?.puntaje ?? 5])))
    const meds = (m.data ?? []) as Medicion[]
    const hits = (h.data ?? []) as Hito[]
    setAvances(
      Object.fromEntries(
        dims.map((x) => {
          const vals = objs
            .filter((ob) => ob.dimension_id === x.id)
            .map((ob) => calcularAvance(ob, meds.filter((y) => y.objetivo_id === ob.id), hits.filter((y) => y.objetivo_id === ob.id)).porcentaje)
            .filter((v): v is number => v != null)
          return [x.id, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null]
        }),
      ),
    )
  }, [ciclo.id, mes, anterior])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const puntaje = (dimId: string, m: string) => evaluaciones.find((e) => e.dimension_id === dimId && e.mes === m)?.puntaje ?? null
  const yaEvaluado = dimensiones.some((d) => puntaje(d.id, mes) != null)

  const guardar = async () => {
    setGuardando(true)
    await supabase
      .from('evaluaciones_dimension')
      .upsert(
        dimensiones.map((d) => ({ dimension_id: d.id, mes, puntaje: borrador[d.id] ?? 5 })),
        { onConflict: 'dimension_id,mes' },
      )
    await cargar()
    setGuardando(false)
    setGuardado(true)
  }

  // La rueda muestra lo guardado; mientras se evalúa por primera vez, el borrador
  const ejes = dimensiones.map((d) => ({ nombre: d.nombre, valor: yaEvaluado ? puntaje(d.id, mes) : (borrador[d.id] ?? null) }))
  const descuidadas = dimensiones.filter((d) => (puntaje(d.id, mes) ?? 10) <= 4)
  const metasBienAreaMal = dimensiones.filter((d) => (puntaje(d.id, mes) ?? 10) <= 5 && (avances[d.id] ?? 0) >= 0.6)

  return (
    <div>
      <h1 className="text-2xl font-bold">Rueda de la vida</h1>
      <p className="mt-1 text-sm text-slate-400">
        Tu satisfacción con cada área, de 1 a 10, aparte del cumplimiento de metas. Sirve para ver qué estás descuidando.
      </p>

      <div className="mt-4 rounded-xl border border-slate-800 p-2">
        <Rueda ejes={ejes} />
        {!yaEvaluado && <p className="pb-2 text-center text-xs text-slate-500">Vista previa: guardá la evaluación para registrarla.</p>}
      </div>

      {descuidadas.length > 0 && (
        <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
          💡 {descuidadas.map((d) => d.nombre).join(' y ')} {descuidadas.length === 1 ? 'viene' : 'vienen'} bajo este mes. No hace falta una meta
          nueva: a veces alcanza con un hábito chico de mantenimiento.
        </p>
      )}
      {metasBienAreaMal.length > 0 && (
        <p className="mt-2 rounded-xl border border-violet-400/40 bg-violet-400/10 p-3 text-sm text-violet-100">
          🎯 En {metasBienAreaMal.map((d) => d.nombre).join(' y ')} avanzás con tus metas, pero tu satisfacción es baja. ¿Son las metas
          correctas para esa área?
        </p>
      )}

      <section className="mt-6 rounded-xl border border-slate-800 p-4">
        <h2 className="font-semibold">Evaluación de {nombreDelMes(mes)}</h2>
        <ul className="mt-3 space-y-4">
          {dimensiones.map((d) => (
            <li key={d.id}>
              <div className="flex items-center justify-between text-sm">
                <span>{d.nombre}</span>
                <span className="font-semibold tabular-nums">{borrador[d.id] ?? 5}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={borrador[d.id] ?? 5}
                onChange={(e) => {
                  setGuardado(false)
                  setBorrador((b) => ({ ...b, [d.id]: Number(e.target.value) }))
                }}
                className="mt-1 w-full accent-violet-400"
                aria-label={`Satisfacción con ${d.nombre}`}
              />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-3">
          <BotonPrimario onClick={() => void guardar()} disabled={guardando || !dimensiones.length}>
            {yaEvaluado ? 'Actualizar' : 'Guardar evaluación'}
          </BotonPrimario>
          {guardado && <span className="text-sm text-emerald-400">Guardado</span>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">Detalle por categoría</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 font-normal">Categoría</th>
              <th className="py-1 text-right font-normal">Mes</th>
              <th className="py-1 text-right font-normal">Anterior</th>
              <th className="py-1 text-right font-normal">Metas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {dimensiones.map((d) => {
              const a = avances[d.id]
              return (
                <tr key={d.id}>
                  <td className="py-2">
                    {d.nombre}
                    <span className="block text-xs text-slate-500">{ESTADOS_CATEGORIA[d.estado ?? 'prioritaria'].nombre}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{puntaje(d.id, mes) ?? '—'}</td>
                  <td className="py-2 text-right tabular-nums text-slate-400">{puntaje(d.id, anterior) ?? '—'}</td>
                  <td className="py-2 text-right tabular-nums text-slate-400">{a == null ? '—' : `${Math.round(a * 100)}%`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
