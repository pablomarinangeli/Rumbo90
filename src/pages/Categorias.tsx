import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Volver, inputClase } from '../components/ui'
import { DIMENSION_CAMPOS, ESTADOS_CATEGORIA, type Ciclo, type Dimension, type EstadoCategoria, type Subcategoria } from '../lib/datos'
import { supabase } from '../lib/supabase'

export default function Categorias({ ciclo }: { ciclo: Ciclo }) {
  const navigate = useNavigate()
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [nuevas, setNuevas] = useState<Record<string, string>>({})

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('dimensiones').select(DIMENSION_CAMPOS).eq('ciclo_id', ciclo.id).order('orden')
    const dims = (data ?? []) as Dimension[]
    setDimensiones(dims)
    if (!dims.length) return
    const { data: subs } = await supabase
      .from('subcategorias')
      .select('id, dimension_id, nombre, orden')
      .in('dimension_id', dims.map((d) => d.id))
      .order('orden')
    setSubcategorias(subs ?? [])
  }, [ciclo.id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cambiarEstado = async (d: Dimension, estado: EstadoCategoria) => {
    setDimensiones((ds) => ds.map((x) => (x.id === d.id ? { ...x, estado } : x)))
    await supabase.from('dimensiones').update({ estado }).eq('id', d.id)
  }

  const renombrar = async (tabla: 'dimensiones' | 'subcategorias', id: string, anterior: string, nombre: string) => {
    if (!nombre.trim() || nombre.trim() === anterior) return
    await supabase.from(tabla).update({ nombre: nombre.trim() }).eq('id', id)
    void cargar()
  }

  const agregar = async (e: FormEvent, d: Dimension) => {
    e.preventDefault()
    const nombre = (nuevas[d.id] ?? '').trim()
    if (!nombre) return
    const orden = subcategorias.filter((s) => s.dimension_id === d.id).length
    await supabase.from('subcategorias').insert({ dimension_id: d.id, nombre, orden })
    setNuevas((n) => ({ ...n, [d.id]: '' }))
    void cargar()
  }

  const borrar = async (s: Subcategoria) => {
    if (!confirm(`¿Borrar «${s.nombre}»? Las metas que la usan quedan sin subcategoría.`)) return
    await supabase.from('subcategorias').delete().eq('id', s.id)
    void cargar()
  }

  return (
    <div>
      <Volver onClick={() => navigate(-1)} />
      <h1 className="text-2xl font-bold">Categorías</h1>
      <p className="mt-1 text-sm text-slate-400">
        Elegí dónde poner el foco en este ciclo. No hace falta tener metas en todas: la disciplina también es elegir.
      </p>
      <ul className="mt-6 space-y-4">
        {dimensiones.map((d) => (
          <li key={d.id} className="rounded-xl border border-slate-800 p-4">
            <input
              defaultValue={d.nombre}
              onBlur={(e) => void renombrar('dimensiones', d.id, d.nombre, e.target.value)}
              className="w-full bg-transparent font-semibold focus:outline-none"
              aria-label="Nombre de la categoría"
            />
            {d.descripcion && <p className="mt-1 text-xs text-slate-500">{d.descripcion}</p>}
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs">
              {(Object.keys(ESTADOS_CATEGORIA) as EstadoCategoria[]).map((estado) => (
                <button
                  key={estado}
                  onClick={() => void cambiarEstado(d, estado)}
                  className={`rounded-lg border px-2 py-1.5 ${d.estado === estado ? `${ESTADOS_CATEGORIA[estado].clase} font-semibold` : 'border-slate-700 text-slate-500'}`}
                >
                  {ESTADOS_CATEGORIA[estado].nombre}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{ESTADOS_CATEGORIA[d.estado ?? 'prioritaria'].ayuda}</p>

            <ul className="mt-3 space-y-1">
              {subcategorias
                .filter((s) => s.dimension_id === d.id)
                .map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <input
                      defaultValue={s.nombre}
                      onBlur={(e) => void renombrar('subcategorias', s.id, s.nombre, e.target.value)}
                      className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-slate-300 focus:border-slate-700 focus:outline-none"
                      aria-label="Nombre de la subcategoría"
                    />
                    <button onClick={() => void borrar(s)} className="text-slate-600" aria-label={`Borrar ${s.nombre}`}>
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
            <form onSubmit={(e) => void agregar(e, d)} className="mt-2 flex gap-2">
              <input
                value={nuevas[d.id] ?? ''}
                onChange={(e) => setNuevas((n) => ({ ...n, [d.id]: e.target.value }))}
                placeholder="Nueva subcategoría"
                className={`${inputClase} py-1 text-sm`}
              />
              <button type="submit" className="shrink-0 text-sm font-semibold text-emerald-400">
                Agregar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
