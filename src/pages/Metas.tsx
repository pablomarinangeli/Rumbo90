import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Ciclo, Dimension, Objetivo } from '../lib/datos'

function rango(o: Objetivo) {
  if (o.tipo === 'proyecto') return 'Proyecto'
  if (o.valor_inicial == null || o.valor_meta == null) return 'Por definir'
  return `${o.valor_inicial} → ${o.valor_meta} ${o.unidad ?? ''}`.trim()
}

export default function Metas({ ciclo }: { ciclo: Ciclo }) {
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])

  useEffect(() => {
    supabase
      .from('dimensiones')
      .select('id, nombre, orden')
      .eq('ciclo_id', ciclo.id)
      .order('orden')
      .then(({ data }) => setDimensiones(data ?? []))
    supabase
      .from('objetivos')
      .select('id, codigo, titulo, descripcion, tipo, unidad, valor_inicial, valor_meta, dimension_id')
      .eq('ciclo_id', ciclo.id)
      .order('codigo')
      .then(({ data }) => setObjetivos(data ?? []))
  }, [ciclo.id])

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis metas</h1>
      {dimensiones.map((d) => {
        const propios = objetivos.filter((o) => o.dimension_id === d.id)
        return (
          <section key={d.id} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">{d.nombre}</h2>
            <ul className="mt-2 space-y-2">
              {propios.map((o) => (
                <li key={o.id} className="rounded-xl border border-slate-800 p-4">
                  <p className="font-medium">{o.titulo}</p>
                  <p className="mt-1 text-sm text-slate-400">{rango(o)}</p>
                  {o.descripcion && <p className="mt-1 text-sm text-slate-500">{o.descripcion}</p>}
                </li>
              ))}
              {propios.length === 0 && <li className="text-sm text-slate-500">Sin metas todavía.</li>}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
