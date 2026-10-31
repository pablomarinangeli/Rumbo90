import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarraAvance, BotonPrimario, Campo, Volver, inputClase } from '../components/ui'
import { calcularAvance } from '../lib/avance'
import {
  HABITO_CAMPOS,
  OBJETIVO_CAMPOS,
  describirFrecuencia,
  fechaISO,
  type Habito,
  type Hito,
  type Medicion,
  type Objetivo,
} from '../lib/datos'
import { linkSugerencia, sugerirParaMeta, temasDeMeta } from '../lib/sugerencias'
import { supabase } from '../lib/supabase'

export default function ObjetivoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [hitos, setHitos] = useState<Hito[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [todos, setTodos] = useState<Habito[]>([])
  const [dimension, setDimension] = useState<string | null>(null)
  const [verTodas, setVerTodas] = useState(false)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(fechaISO())
  const [nuevoHito, setNuevoHito] = useState('')

  const cargar = useCallback(async () => {
    if (!id) return
    const [o, m, h, v, t] = await Promise.all([
      supabase.from('objetivos').select(OBJETIVO_CAMPOS).eq('id', id).single(),
      supabase.from('mediciones').select('id, objetivo_id, fecha, valor, unidad, nota').eq('objetivo_id', id).order('fecha', { ascending: false }),
      supabase.from('hitos').select('id, objetivo_id, titulo, fecha, estado, orden').eq('objetivo_id', id).order('orden'),
      supabase.from('habitos_objetivos').select(`habitos(${HABITO_CAMPOS})`).eq('objetivo_id', id),
      supabase.from('habitos').select(HABITO_CAMPOS).eq('activo', true),
    ])
    const obj = o.data as Objetivo | null
    if (obj?.dimension_id) {
      const { data: d } = await supabase.from('dimensiones').select('nombre').eq('id', obj.dimension_id).maybeSingle()
      setDimension(d?.nombre ?? null)
    }
    setTodos((t.data ?? []) as Habito[])
    setObjetivo(o.data as Objetivo | null)
    setMediciones(m.data ?? [])
    setHitos(h.data ?? [])
    setHabitos(((v.data ?? []) as unknown as { habitos: Habito }[]).map((x) => x.habitos))
  }, [id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (!objetivo) return <p className="text-slate-500">Cargando…</p>

  const avance = calcularAvance(objetivo, mediciones, hitos)
  const meta = { ...objetivo, dimension }
  const sugerencias = sugerirParaMeta(meta, habitos.map((h) => h.titulo), verTodas ? 12 : 4)
  const temas = temasDeMeta(meta)
  const existente = (titulo: string) => todos.find((h) => h.titulo.trim().toLowerCase() === titulo.trim().toLowerCase())

  const vincular = async (h: Habito) => {
    await supabase.from('habitos_objetivos').insert({ habito_id: h.id, objetivo_id: objetivo.id })
    void cargar()
  }

  const registrar = async (e: FormEvent) => {
    e.preventDefault()
    const numero = Number(valor.replace(',', '.'))
    if (Number.isNaN(numero)) return
    await supabase.from('mediciones').insert({
      client_id: crypto.randomUUID(),
      objetivo_id: objetivo.id,
      fecha,
      valor: numero,
      unidad: objetivo.unidad,
    })
    setValor('')
    void cargar()
  }

  const borrarMedicion = async (m: Medicion) => {
    await supabase.from('mediciones').delete().eq('id', m.id)
    void cargar()
  }

  const agregarHito = async (e: FormEvent) => {
    e.preventDefault()
    if (!nuevoHito.trim()) return
    await supabase.from('hitos').insert({ objetivo_id: objetivo.id, titulo: nuevoHito.trim(), orden: hitos.length })
    setNuevoHito('')
    void cargar()
  }

  const alternarHito = async (h: Hito) => {
    await supabase
      .from('hitos')
      .update({ estado: h.estado === 'hecho' ? 'pendiente' : 'hecho' })
      .eq('id', h.id)
    void cargar()
  }

  return (
    <div>
      <Volver onClick={() => navigate('/metas')} />
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{objetivo.titulo}</h1>
        <Link to={`/metas/${objetivo.id}/editar`} className="shrink-0 pt-1 text-sm text-emerald-400">
          Editar
        </Link>
      </div>
      {objetivo.descripcion && <p className="mt-1 text-sm text-slate-400">{objetivo.descripcion}</p>}

      <section className="mt-6 rounded-xl border border-slate-800 p-4">
        <p className="text-sm text-slate-400">{avance.detalle}</p>
        {avance.porcentaje != null && <p className="mt-1 text-3xl font-bold">{Math.round(avance.porcentaje * 100)}%</p>}
        <div className="mt-3">
          <BarraAvance valor={avance.porcentaje} />
        </div>
        {objetivo.tipo !== 'proyecto' && objetivo.valor_inicial != null && objetivo.valor_meta != null && (
          <p className="mt-2 text-xs text-slate-500">
            Inicial {objetivo.valor_inicial} → meta {objetivo.valor_meta} {objetivo.unidad}
          </p>
        )}
      </section>

      {objetivo.tipo === 'proyecto' ? (
        <section className="mt-6">
          <h2 className="font-semibold">Hitos</h2>
          <ul className="mt-2 space-y-2">
            {hitos.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => void alternarHito(h)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-800 p-3 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${h.estado === 'hecho' ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600'}`}
                  >
                    {h.estado === 'hecho' && '✓'}
                  </span>
                  <span className={h.estado === 'hecho' ? 'text-slate-500 line-through' : ''}>{h.titulo}</span>
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => void agregarHito(e)} className="mt-3 flex gap-2">
            <input value={nuevoHito} onChange={(e) => setNuevoHito(e.target.value)} className={inputClase} placeholder="Nuevo hito" />
            <BotonPrimario type="submit">Agregar</BotonPrimario>
          </form>
        </section>
      ) : (
        <section className="mt-6">
          <h2 className="font-semibold">Registrar medición</h2>
          <form onSubmit={(e) => void registrar(e)} className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <Campo etiqueta={`Valor${objetivo.unidad ? ` (${objetivo.unidad})` : ''}`}>
              <input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={inputClase} />
            </Campo>
            <Campo etiqueta="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClase} />
            </Campo>
            <BotonPrimario type="submit">Guardar</BotonPrimario>
          </form>
          {objetivo.tipo === 'conteo' && (
            <p className="mt-1 text-xs text-slate-500">Registrá el total acumulado, por ejemplo 2 si ya terminaste 2 libros.</p>
          )}
          <ul className="mt-4 divide-y divide-slate-800">
            {mediciones.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-400">{m.fecha.split('-').reverse().join('/')}</span>
                <span className="flex items-center gap-4">
                  <span className="font-medium tabular-nums">
                    {m.valor} {m.unidad}
                  </span>
                  <button onClick={() => void borrarMedicion(m)} className="text-slate-600" aria-label="Borrar medición">
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">Hábitos que la impulsan</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {habitos.map((h) => (
            <li key={h.id}>
              <Link to={`/habitos/${h.id}`} className="text-slate-300">
                {h.titulo} <span className="text-slate-500">· {describirFrecuencia(h.frecuencia)}</span>
              </Link>
            </li>
          ))}
          {habitos.length === 0 && <li className="text-slate-500">Ninguno todavía. Mirá las sugerencias de abajo.</li>}
        </ul>
        <Link to={`/habitos/nuevo?objetivo=${objetivo.id}`} className="mt-2 inline-block text-sm text-emerald-400">
          + Crear un hábito para esta meta
        </Link>
      </section>

      {sugerencias.length > 0 && (
        <section className="mt-6 rounded-xl border border-violet-400/30 bg-violet-400/5 p-4">
          <h2 className="font-semibold">💡 Hábitos sugeridos para esta meta</h2>
          <p className="mt-1 text-xs text-slate-400">
            {temas.length ? `Según tu meta: ${temas.join(' y ').toLowerCase()}.` : 'Ideas generales para empezar.'} Tocá una para
            cargarla ya vinculada y ajustala a tu medida.
          </p>
          <ul className="mt-3 space-y-2">
            {sugerencias.map((s) => {
              const ya = existente(s.titulo)
              return (
                <li key={s.titulo} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className={s.tipo === 'reducir' ? 'text-rose-300' : 'text-emerald-400'}>
                        {s.tipo === 'reducir' ? 'Reducir: ' : ''}
                      </span>
                      {s.titulo}
                    </p>
                    <p className="text-xs text-slate-400">{s.porque}</p>
                  </div>
                  {ya ? (
                    <button onClick={() => void vincular(ya)} className="shrink-0 text-sm font-semibold text-violet-300">
                      Vincular
                    </button>
                  ) : (
                    <Link to={linkSugerencia(s, objetivo.id)} className="shrink-0 text-sm font-semibold text-violet-300">
                      + Agregar
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          {!verTodas && (
            <button onClick={() => setVerTodas(true)} className="mt-2 text-sm text-slate-400">
              Ver más ideas
            </button>
          )}
        </section>
      )}
    </div>
  )
}
