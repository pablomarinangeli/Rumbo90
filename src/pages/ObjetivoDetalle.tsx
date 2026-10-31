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
import { supabase } from '../lib/supabase'

export default function ObjetivoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [hitos, setHitos] = useState<Hito[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(fechaISO())
  const [nuevoHito, setNuevoHito] = useState('')

  const cargar = useCallback(async () => {
    if (!id) return
    const [o, m, h, v] = await Promise.all([
      supabase.from('objetivos').select(OBJETIVO_CAMPOS).eq('id', id).single(),
      supabase.from('mediciones').select('id, objetivo_id, fecha, valor, unidad, nota').eq('objetivo_id', id).order('fecha', { ascending: false }),
      supabase.from('hitos').select('id, objetivo_id, titulo, fecha, estado, orden').eq('objetivo_id', id).order('orden'),
      supabase.from('habitos_objetivos').select(`habitos(${HABITO_CAMPOS})`).eq('objetivo_id', id),
    ])
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
          {habitos.length === 0 && <li className="text-slate-500">Ninguno todavía. Vinculalos desde la pestaña Hábitos.</li>}
        </ul>
      </section>
    </div>
  )
}
