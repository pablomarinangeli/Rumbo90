import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BotonPrimario, BotonSecundario, inputClase } from '../components/ui'
import {
  guardarConversacion,
  hablarConCoach,
  leerConversacion,
  propuestaDe,
  textoDe,
  type BloquesCoach,
  type BloquesUsuario,
  type HabitoPropuesto,
  type MensajeCoach,
  type MetaPropuesta,
  type PropuestaHabitos,
  type PropuestaMetas,
} from '../lib/coach'
import { DIMENSION_CAMPOS,
  ESTADOS_CATEGORIA,
  HABITO_CAMPOS,
  OBJETIVO_CAMPOS,
  TIPOS_OBJETIVO,
  describirFrecuencia,
  describirLimite,
  diaDelCiclo,
  type Ciclo,
  type Dimension,
  type Habito,
  type Objetivo,
  type Subcategoria,
} from '../lib/datos'
import { normalizar } from '../lib/sugerencias'
import { supabase } from '../lib/supabase'

const SALUDO =
  '¡Hola! Soy tu coach. Contame qué te gustaría cambiar o lograr. Por ejemplo: "no estoy contento con mi peso", "tengo un desafío en 2 meses" o "quiero aprovechar mejor la IA en mi trabajo". Primero elegimos las metas y después negociamos los hábitos.'

const EJEMPLOS = ['No estoy contento con mi peso actual', 'Tengo un desafío importante en 2 meses', 'Quiero usar la IA de la mejor forma para mi rol']

const TODOS = [0, 1, 2, 3, 4, 5, 6]

function describirHabitoPropuesto(h: HabitoPropuesto) {
  if (h.tipo === 'reducir') return describirLimite(h.limite_semana)
  if (h.veces_semana) return describirFrecuencia({ tipo: 'veces_semana', veces: h.veces_semana })
  return describirFrecuencia({ tipo: 'dias', dias: h.dias?.length ? h.dias : TODOS })
}

const numeroONull = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

export default function Coach({ ciclo }: { ciclo: Ciclo }) {
  const [mensajes, setMensajes] = useState<MensajeCoach[]>(leerConversacion)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const final = useRef<HTMLDivElement>(null)

  const cargarDatos = useCallback(async () => {
    const [d, o, h] = await Promise.all([
      supabase.from('dimensiones').select(DIMENSION_CAMPOS).eq('ciclo_id', ciclo.id).order('orden'),
      supabase.from('objetivos').select(OBJETIVO_CAMPOS).eq('ciclo_id', ciclo.id),
      supabase.from('habitos').select(HABITO_CAMPOS).eq('ciclo_id', ciclo.id).eq('activo', true),
    ])
    const dims = (d.data ?? []) as Dimension[]
    setDimensiones(dims)
    if (dims.length) {
      const { data: s } = await supabase
        .from('subcategorias')
        .select('id, dimension_id, nombre, orden')
        .in('dimension_id', dims.map((x) => x.id))
        .order('orden')
      setSubcategorias((s ?? []) as Subcategoria[])
    }
    setObjetivos((o.data ?? []) as Objetivo[])
    setHabitos((h.data ?? []) as Habito[])
  }, [ciclo.id])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    guardarConversacion(mensajes)
    final.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, pensando])

  const contexto = (objs = objetivos) => {
    const { dia, total } = diaDelCiclo(ciclo)
    const dims =
      dimensiones
        .map((d) => {
          const subs = subcategorias.filter((x) => x.dimension_id === d.id).map((x) => x.nombre)
          const estado = ESTADOS_CATEGORIA[d.estado ?? 'prioritaria'].nombre.toLowerCase()
          return `- ${d.nombre} [${estado}]${subs.length ? `: ${subs.join(' · ')}` : ''}`
        })
        .join('\n') || 'ninguna'
    const metas = objs.length
      ? objs
          .map((o) => `- ${o.titulo} (${o.tipo}${o.valor_meta != null ? `, de ${o.valor_inicial ?? '?'} a ${o.valor_meta} ${o.unidad ?? ''}` : ''})`)
          .join('\n')
      : 'ninguna'
    const habs = habitos.length
      ? habitos
          .map((h) => `- ${h.titulo} (${h.tipo === 'reducir' ? `a reducir, ${describirLimite(h.limite_semana)}` : describirFrecuencia(h.frecuencia)})`)
          .join('\n')
      : 'ninguno'
    return `Hoy: ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
Ciclo: ${ciclo.nombre}, del ${ciclo.fecha_inicio} al ${ciclo.fecha_fin} (día ${dia} de ${total}).
Categorías (estado y subcategorías):
${dims}
Metas actuales:
${metas}
Hábitos actuales:
${habs}`
  }

  // Propuesta abierta: el último turno del coach trae una propuesta sin responder
  const ultimo = mensajes.at(-1)
  const pendiente = ultimo?.role === 'assistant' ? propuestaDe(ultimo.content) : null

  const enviar = async (mensaje: string, respuestaPropuesta?: string, objs?: Objetivo[]) => {
    const bloques: BloquesUsuario = []
    if (pendiente) {
      bloques.push({
        type: 'tool_result',
        tool_use_id: pendiente.id,
        content: respuestaPropuesta ?? 'El usuario no respondió la propuesta y siguió conversando.',
      })
    }
    if (mensaje.trim()) bloques.push({ type: 'text', text: mensaje.trim() })
    if (!bloques.length) return
    const anteriores = mensajes
    const conUsuario: MensajeCoach[] = [...anteriores, { role: 'user', content: bloques }]
    setMensajes(conUsuario)
    setTexto('')
    setError(null)
    setPensando(true)
    try {
      const respuesta = await hablarConCoach(conUsuario, contexto(objs))
      setMensajes([...conUsuario, { role: 'assistant', content: respuesta as unknown as BloquesCoach }])
    } catch (e) {
      setMensajes(anteriores)
      setTexto(mensaje)
      setError(e instanceof Error ? e.message : 'Algo falló. Probá de nuevo.')
    } finally {
      setPensando(false)
    }
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    if (!pensando) void enviar(texto)
  }

  const nueva = () => {
    if (mensajes.length && !confirm('¿Empezar una conversación nueva? Se borra la actual.')) return
    setMensajes([])
    setError(null)
  }

  const dimensionDe = (nombre: string) =>
    dimensiones.find((d) => normalizar(d.nombre) === normalizar(nombre))?.id ??
    dimensiones.find((d) => normalizar(nombre).includes(normalizar(d.nombre)) || normalizar(d.nombre).includes(normalizar(nombre)))?.id ??
    null

  const subcategoriaDe = (dimensionId: string | null, nombre: string | null) => {
    if (!dimensionId || !nombre) return null
    const subs = subcategorias.filter((x) => x.dimension_id === dimensionId)
    return (
      subs.find((x) => normalizar(x.nombre) === normalizar(nombre))?.id ??
      subs.find((x) => normalizar(x.nombre).includes(normalizar(nombre)) || normalizar(nombre).includes(normalizar(x.nombre)))?.id ??
      null
    )
  }

  /** Etapa 1: crea las metas tal como las dejó el usuario */
  const crearMetas = async (propuesta: PropuestaMetas, finales: MetaPropuesta[], descartadas: MetaPropuesta[]) => {
    const nuevas: Objetivo[] = []
    for (const m of finales) {
      const dimensionId = dimensionDe(m.dimension)
      const proyecto = m.tipo === 'proyecto'
      const { data } = await supabase
        .from('objetivos')
        .insert({
          ciclo_id: ciclo.id,
          fecha_meta: ciclo.fecha_fin,
          titulo: m.titulo.trim(),
          descripcion: m.descripcion,
          tipo: m.tipo,
          unidad: proyecto ? null : m.unidad,
          valor_inicial: proyecto ? null : m.valor_inicial,
          valor_meta: proyecto ? null : m.valor_meta,
          dimension_id: dimensionId,
          subcategoria_id: subcategoriaDe(dimensionId, m.subcategoria),
        })
        .select(OBJETIVO_CAMPOS)
        .single()
      if (data) nuevas.push(data as Objetivo)
    }
    const objs = [...objetivos, ...nuevas]
    setObjetivos(objs)
    const detalle = finales
      .map((m) => `«${m.titulo}» (${m.dimension}${m.subcategoria ? ` / ${m.subcategoria}` : ''}${m.valor_meta != null ? `, de ${m.valor_inicial ?? '?'} a ${m.valor_meta} ${m.unidad ?? ''}` : ''})`)
      .join('; ')
    const editadas = finales.some((m, i) => JSON.stringify(m) !== JSON.stringify(propuesta.metas[i]))
    await enviar(
      '',
      `El usuario creó ${finales.length} meta(s), tal como quedaron${editadas ? ' después de editarlas' : ''}: ${detalle || 'ninguna'}.${
        descartadas.length ? ` Descartó: ${descartadas.map((m) => `«${m.titulo}»`).join(', ')}.` : ''
      } Pasá a la etapa 2: hábitos.`,
      objs,
    )
  }

  /** Etapa 2: crea los hábitos elegidos y los vincula a sus metas */
  const crearHabitos = async (elegidos: HabitoPropuesto[], descartados: HabitoPropuesto[]) => {
    const idsPorTitulo = new Map(objetivos.map((o) => [normalizar(o.titulo), o.id]))
    for (const h of elegidos) {
      const dias = (h.dias ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      const frecuencia =
        h.tipo === 'construir' && h.veces_semana
          ? { tipo: 'veces_semana', veces: Math.min(7, Math.max(1, h.veces_semana)) }
          : { tipo: 'dias', dias: h.tipo === 'construir' && dias.length ? dias : TODOS }
      const { data } = await supabase
        .from('habitos')
        .insert({
          ciclo_id: ciclo.id,
          titulo: h.titulo.trim(),
          tipo: h.tipo,
          frecuencia,
          limite_semana: h.tipo === 'reducir' ? Math.max(0, h.limite_semana ?? 0) : null,
          version_minima: h.version_minima,
        })
        .select('id')
        .single()
      if (!data) continue
      const vinculos = [...new Set(h.metas.map((t) => idsPorTitulo.get(normalizar(t))).filter((x): x is string => Boolean(x)))]
      if (vinculos.length) {
        await supabase.from('habitos_objetivos').insert(vinculos.map((objetivo_id) => ({ habito_id: data.id, objetivo_id })))
      }
    }
    await cargarDatos()
    await enviar(
      '',
      `El usuario creó estos hábitos: ${elegidos.map((h) => `«${h.titulo}»`).join(', ') || 'ninguno'}.${
        descartados.length ? ` Descartó: ${descartados.map((h) => `«${h.titulo}»`).join(', ')}.` : ''
      } Cerrá con un mensaje breve y motivador.`,
    )
  }

  const pedirCambios = (cambios: string) => void enviar('', `El usuario pide cambios: ${cambios}`)

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coach</h1>
        <button onClick={nueva} className="text-sm text-slate-400">
          Nueva conversación
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-400">Paso 1: elegimos tus metas. Paso 2: negociamos los hábitos.</p>

      <ul className="mt-6 flex-1 space-y-3">
        <Burbuja de="coach">{SALUDO}</Burbuja>
        {mensajes.length === 0 && (
          <li className="flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <button key={e} onClick={() => setTexto(e)} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {e}
              </button>
            ))}
          </li>
        )}
        {mensajes.map((m, i) => {
          const visible = textoDe(m.content)
          const propuesta = m.role === 'assistant' ? propuestaDe(m.content) : null
          const abierta = pendiente != null && propuesta?.id === pendiente.id && !pensando
          return (
            <li key={i} className="space-y-3">
              {visible && <Burbuja de={m.role === 'user' ? 'yo' : 'coach'}>{visible}</Burbuja>}
              {propuesta?.tipo === 'metas' && (
                <TarjetaMetas
                  propuesta={propuesta.datos}
                  dimensiones={dimensiones}
                  subcategorias={subcategorias}
                  abierta={abierta}
                  alCrear={crearMetas}
                  alPedirCambios={pedirCambios}
                />
              )}
              {propuesta?.tipo === 'habitos' && (
                <TarjetaHabitos propuesta={propuesta.datos} abierta={abierta} alCrear={crearHabitos} alPedirCambios={pedirCambios} />
              )}
            </li>
          )
        })}
        {pensando && <Burbuja de="coach">Pensando…</Burbuja>}
      </ul>
      <div ref={final} />

      {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
      <form onSubmit={alEnviar} className="sticky bottom-20 mt-4 flex gap-2 bg-slate-950 py-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) alEnviar(e)
          }}
          rows={2}
          maxLength={4000}
          placeholder={pendiente ? 'O escribile qué cambiarías…' : 'Escribí acá…'}
          className={`${inputClase} resize-none`}
        />
        <BotonPrimario type="submit" disabled={pensando || !texto.trim()}>
          Enviar
        </BotonPrimario>
      </form>
    </div>
  )
}

function Burbuja({ de, children }: { de: 'yo' | 'coach'; children: string }) {
  return (
    <div className={`flex ${de === 'yo' ? 'justify-end' : 'justify-start'}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
          de === 'yo' ? 'bg-emerald-500 text-slate-950' : 'border border-slate-800 bg-slate-900 text-slate-100'
        }`}
      >
        {children}
      </p>
    </div>
  )
}

function PedirCambios({ alEnviar, alVolver }: { alEnviar: (c: string) => void; alVolver: () => void }) {
  const [cambios, setCambios] = useState('')
  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (cambios.trim()) alEnviar(cambios.trim())
      }}
    >
      <textarea value={cambios} onChange={(e) => setCambios(e.target.value)} rows={2} placeholder="Ej. Es mucho, dejemos una sola meta" className={`${inputClase} resize-none`} />
      <div className="flex gap-2">
        <BotonPrimario type="submit" disabled={!cambios.trim()}>
          Enviar cambios
        </BotonPrimario>
        <BotonSecundario type="button" onClick={alVolver}>
          Volver
        </BotonSecundario>
      </div>
    </form>
  )
}

function TarjetaMetas({
  propuesta,
  dimensiones,
  subcategorias,
  abierta,
  alCrear,
  alPedirCambios,
}: {
  propuesta: PropuestaMetas
  dimensiones: Dimension[]
  subcategorias: Subcategoria[]
  abierta: boolean
  alCrear: (p: PropuestaMetas, finales: MetaPropuesta[], descartadas: MetaPropuesta[]) => Promise<void>
  alPedirCambios: (c: string) => void
}) {
  const [metas, setMetas] = useState(() => propuesta.metas.map((m) => ({ ...m, subcategoria: m.subcategoria ?? null, elegida: true })))
  const subsDe = (dimension: string) => {
    const d = dimensiones.find((x) => x.nombre === dimension)
    return d ? subcategorias.filter((x) => x.dimension_id === d.id) : []
  }
  const [pidiendo, setPidiendo] = useState(false)
  const [creando, setCreando] = useState(false)
  const cambiar = (i: number, campos: Partial<(typeof metas)[number]>) =>
    setMetas((ms) => ms.map((m, j) => (j === i ? { ...m, ...campos } : m)))
  const quitarElegida = (m: (typeof metas)[number]): MetaPropuesta => {
    const { elegida: _, ...resto } = m
    void _
    return resto
  }

  return (
    <div className="rounded-xl border border-violet-400/40 bg-violet-400/5 p-4">
      <p className="text-xs uppercase tracking-wide text-violet-300">Paso 1 · Metas propuestas</p>
      <p className="mt-1 text-sm">{propuesta.resumen}</p>
      {abierta && <p className="mt-1 text-xs text-slate-400">Editá lo que quieras antes de crearlas. Destildá las que no te convencen.</p>}
      <ul className="mt-3 space-y-3">
        {metas.map((m, i) => (
          <li key={i} className={`rounded-lg border border-slate-800 p-3 ${m.elegida ? '' : 'opacity-50'}`}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!abierta} checked={m.elegida} onChange={() => cambiar(i, { elegida: !m.elegida })} className="accent-violet-400" />
              {abierta ? (
                <input value={m.titulo} onChange={(e) => cambiar(i, { titulo: e.target.value })} className={`${inputClase} py-1 font-medium`} />
              ) : (
                <span className="font-medium">{m.titulo}</span>
              )}
            </label>
            {m.descripcion && <p className="mt-1 text-xs text-slate-400">{m.descripcion}</p>}
            {abierta ? (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <select value={m.dimension} onChange={(e) => cambiar(i, { dimension: e.target.value, subcategoria: null })} className={`${inputClase} py-1 text-xs`}>
                  {!dimensiones.some((d) => d.nombre === m.dimension) && <option value={m.dimension}>{m.dimension}</option>}
                  {dimensiones.map((d) => (
                    <option key={d.id} value={d.nombre}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
                <select value={m.subcategoria ?? ''} onChange={(e) => cambiar(i, { subcategoria: e.target.value || null })} className={`${inputClase} py-1 text-xs`}>
                  <option value="">Sin subcategoría</option>
                  {m.subcategoria && !subsDe(m.dimension).some((x) => x.nombre === m.subcategoria) && <option value={m.subcategoria}>{m.subcategoria}</option>}
                  {subsDe(m.dimension).map((x) => (
                    <option key={x.id} value={x.nombre}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
                <select value={m.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value as MetaPropuesta['tipo'] })} className={`${inputClase} py-1 text-xs`}>
                  {Object.entries(TIPOS_OBJETIVO).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
                {m.tipo !== 'proyecto' && (
                  <>
                    <input
                      inputMode="decimal"
                      value={m.valor_inicial ?? ''}
                      onChange={(e) => cambiar(i, { valor_inicial: numeroONull(e.target.value) })}
                      placeholder="Desde"
                      className={`${inputClase} py-1 text-xs`}
                    />
                    <input
                      inputMode="decimal"
                      value={m.valor_meta ?? ''}
                      onChange={(e) => cambiar(i, { valor_meta: numeroONull(e.target.value) })}
                      placeholder="Hasta"
                      className={`${inputClase} py-1 text-xs`}
                    />
                    <input
                      value={m.unidad ?? ''}
                      onChange={(e) => cambiar(i, { unidad: e.target.value || null })}
                      placeholder="Unidad (kg, libros…)"
                      className={`${inputClase} col-span-2 py-1 text-xs`}
                    />
                  </>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {m.dimension}
                {m.subcategoria && ` / ${m.subcategoria}`}
                {m.valor_meta != null && ` · de ${m.valor_inicial ?? '?'} a ${m.valor_meta} ${m.unidad ?? ''}`}
              </p>
            )}
          </li>
        ))}
      </ul>
      {abierta && !pidiendo && (
        <div className="mt-4 flex flex-wrap gap-2">
          <BotonPrimario
            disabled={creando || !metas.some((m) => m.elegida && m.titulo.trim())}
            onClick={() => {
              setCreando(true)
              const finales = metas.filter((m) => m.elegida && m.titulo.trim()).map(quitarElegida)
              const descartadas = metas.filter((m) => !m.elegida).map(quitarElegida)
              void alCrear(propuesta, finales, descartadas).finally(() => setCreando(false))
            }}
          >
            {creando ? 'Creando…' : 'Crear metas y seguir con hábitos'}
          </BotonPrimario>
          <BotonSecundario onClick={() => setPidiendo(true)}>Pedir otras</BotonSecundario>
        </div>
      )}
      {abierta && pidiendo && <PedirCambios alEnviar={alPedirCambios} alVolver={() => setPidiendo(false)} />}
      {!abierta && (
        <p className="mt-3 text-xs text-slate-500">
          Propuesta cerrada. <Link to="/metas" className="text-violet-300">Ver mis metas</Link>
        </p>
      )}
    </div>
  )
}

function TarjetaHabitos({
  propuesta,
  abierta,
  alCrear,
  alPedirCambios,
}: {
  propuesta: PropuestaHabitos
  abierta: boolean
  alCrear: (elegidos: HabitoPropuesto[], descartados: HabitoPropuesto[]) => Promise<void>
  alPedirCambios: (c: string) => void
}) {
  const [elegidos, setElegidos] = useState(() => new Set(propuesta.habitos.map((_, i) => i)))
  const [pidiendo, setPidiendo] = useState(false)
  const [creando, setCreando] = useState(false)
  const alternar = (i: number) =>
    setElegidos((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  return (
    <div className="rounded-xl border border-violet-400/40 bg-violet-400/5 p-4">
      <p className="text-xs uppercase tracking-wide text-violet-300">Paso 2 · Hábitos propuestos</p>
      <p className="mt-1 text-sm">{propuesta.resumen}</p>
      <ul className="mt-3 space-y-2">
        {propuesta.habitos.map((h, i) => (
          <li key={i}>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" disabled={!abierta} checked={elegidos.has(i)} onChange={() => alternar(i)} className="mt-1 accent-violet-400" />
              <span>
                {h.tipo === 'reducir' && <span className="font-medium text-rose-300">Reducir: </span>}
                <span className="font-medium">{h.titulo}</span>
                <span className="block text-xs text-slate-400">
                  {describirHabitoPropuesto(h)}
                  {h.version_minima && ` · ${h.tipo === 'reducir' ? 'Plan B' : 'Mínimo'}: ${h.version_minima}`}
                </span>
                <span className="block text-xs text-slate-500">{h.porque}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {abierta && !pidiendo && (
        <div className="mt-4 flex flex-wrap gap-2">
          <BotonPrimario
            disabled={creando || elegidos.size === 0}
            onClick={() => {
              setCreando(true)
              void alCrear(
                propuesta.habitos.filter((_, i) => elegidos.has(i)),
                propuesta.habitos.filter((_, i) => !elegidos.has(i)),
              ).finally(() => setCreando(false))
            }}
          >
            {creando ? 'Creando…' : 'Crear hábitos'}
          </BotonPrimario>
          <BotonSecundario onClick={() => setPidiendo(true)}>Negociar cambios</BotonSecundario>
        </div>
      )}
      {abierta && pidiendo && <PedirCambios alEnviar={alPedirCambios} alVolver={() => setPidiendo(false)} />}
      {!abierta && (
        <p className="mt-3 text-xs text-slate-500">
          Propuesta cerrada. <Link to="/habitos" className="text-violet-300">Ver mis hábitos</Link>
        </p>
      )}
    </div>
  )
}
