import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BotonPrimario, BotonSecundario, Campo, Volver, inputClase } from '../components/ui'
import { DIAS_CORTOS, HABITO_CAMPOS, OBJETIVO_CAMPOS, type Ciclo, type Habito, type Objetivo } from '../lib/datos'
import { supabase } from '../lib/supabase'

// Lunes primero
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]

export default function HabitoForm({ ciclo }: { ciclo: Ciclo }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tipo, setTipo] = useState<Habito['tipo']>(params.get('tipo') === 'reducir' ? 'reducir' : 'construir')
  const [limite, setLimite] = useState(params.get('limite') ?? '2')
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [titulo, setTitulo] = useState(params.get('titulo') ?? '')
  const [modo, setModo] = useState<'dias' | 'veces_semana'>('dias')
  const [dias, setDias] = useState<number[]>(
    params.get('dias')?.split(',').map(Number) ?? [0, 1, 2, 3, 4, 5, 6],
  )
  const [veces, setVeces] = useState('3')
  const [hora, setHora] = useState('')
  const [duracion, setDuracion] = useState('')
  const [versionMinima, setVersionMinima] = useState(params.get('minima') ?? '')
  const [activo, setActivo] = useState(true)
  const [vinculados, setVinculados] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('objetivos')
      .select(OBJETIVO_CAMPOS)
      .eq('ciclo_id', ciclo.id)
      .order('created_at')
      .then(({ data }) => setObjetivos((data ?? []) as Objetivo[]))
    if (!id) return
    void (async () => {
      const [h, v] = await Promise.all([
        supabase.from('habitos').select(HABITO_CAMPOS).eq('id', id).single(),
        supabase.from('habitos_objetivos').select('objetivo_id').eq('habito_id', id),
      ])
      const habito = h.data as Habito | null
      if (!habito) return
      setTitulo(habito.titulo)
      setTipo(habito.tipo)
      setLimite(String(habito.limite_semana ?? 0))
      setModo(habito.frecuencia.tipo)
      if (habito.frecuencia.tipo === 'dias') setDias(habito.frecuencia.dias)
      else setVeces(String(habito.frecuencia.veces))
      setHora(habito.hora?.slice(0, 5) ?? '')
      setDuracion(habito.duracion_min?.toString() ?? '')
      setVersionMinima(habito.version_minima ?? '')
      setActivo(habito.activo)
      setVinculados((v.data ?? []).map((x) => x.objetivo_id))
    })()
  }, [ciclo.id, id])

  const alternar = <T,>(lista: T[], valor: T) =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const reducir = tipo === 'reducir'
    if (!reducir && modo === 'dias' && dias.length === 0) {
      setError('Elegí al menos un día')
      return
    }
    setGuardando(true)
    setError(null)
    const datos = {
      titulo: titulo.trim(),
      tipo,
      limite_semana: reducir ? Math.max(0, Math.round(Number(limite) || 0)) : null,
      frecuencia: reducir || modo === 'dias' ? { tipo: 'dias', dias: reducir ? [0, 1, 2, 3, 4, 5, 6] : dias } : { tipo: 'veces_semana', veces: Number(veces) || 1 },
      hora: reducir ? null : hora || null,
      duracion_min: reducir || !duracion ? null : Number(duracion),
      version_minima: versionMinima.trim() || null,
      activo,
    }
    const { data, error } = id
      ? await supabase.from('habitos').update(datos).eq('id', id).select('id').single()
      : await supabase.from('habitos').insert({ ...datos, ciclo_id: ciclo.id }).select('id').single()
    if (error || !data) {
      setError(error?.message ?? 'No se pudo guardar')
      setGuardando(false)
      return
    }
    await supabase.from('habitos_objetivos').delete().eq('habito_id', data.id)
    if (vinculados.length) {
      await supabase
        .from('habitos_objetivos')
        .insert(vinculados.map((objetivo_id) => ({ habito_id: data.id, objetivo_id })))
    }
    navigate('/habitos', { replace: true })
  }

  const eliminar = async () => {
    if (!id || !confirm('¿Eliminar este hábito? Si solo querés dejarlo de lado, mejor pausalo.')) return
    await supabase.from('habitos').delete().eq('id', id)
    navigate('/habitos', { replace: true })
  }

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4">
      <Volver onClick={() => navigate(-1)} />
      <h1 className="text-2xl font-bold">{id ? 'Editar hábito' : 'Nuevo hábito'}</h1>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ['construir', 'Bueno: a construir', 'border-emerald-500 text-emerald-400'],
            ['reducir', 'Malo: a reducir o eliminar', 'border-rose-400 text-rose-300'],
          ] as const
        ).map(([t, etiqueta, activa]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded-lg border px-3 py-2 ${tipo === t ? `${activa} font-semibold` : 'border-slate-700 text-slate-400'}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <Campo etiqueta="Hábito">
        <input
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={inputClase}
          placeholder={tipo === 'reducir' ? 'Ej. Pedir delivery' : 'Ej. Leer 20 minutos'}
        />
      </Campo>

      {tipo === 'reducir' ? (
        <Campo etiqueta="Máximo por semana" ayuda="0 si lo querés eliminar. Cuanto menos, mejor: el límite es el techo, no la meta.">
          <input type="number" min={0} max={50} value={limite} onChange={(e) => setLimite(e.target.value)} className={`${inputClase} w-24`} />
        </Campo>
      ) : (
      <>
      <fieldset>
        <legend className="mb-1 text-sm text-slate-400">Frecuencia</legend>
        <div className="mb-2 flex gap-2 text-sm">
          {(['dias', 'veces_semana'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-lg border px-3 py-1.5 ${modo === m ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400'}`}
            >
              {m === 'dias' ? 'Días fijos' : 'Veces por semana'}
            </button>
          ))}
        </div>
        {modo === 'dias' ? (
          <div className="grid grid-cols-7 gap-1">
            {ORDEN_DIAS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias((x) => alternar(x, d))}
                className={`rounded-lg py-2 text-xs ${dias.includes(d) ? 'bg-emerald-500 font-semibold text-slate-950' : 'bg-slate-800 text-slate-400'}`}
              >
                {DIAS_CORTOS.at(d)}
              </button>
            ))}
          </div>
        ) : (
          <input type="number" min={1} max={7} value={veces} onChange={(e) => setVeces(e.target.value)} className={`${inputClase} w-24`} />
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Hora (opcional)">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClase} />
        </Campo>
        <Campo etiqueta="Duración en minutos">
          <input type="number" min={1} value={duracion} onChange={(e) => setDuracion(e.target.value)} className={inputClase} />
        </Campo>
      </div>

      </>
      )}

      {tipo === 'reducir' ? (
        <Campo etiqueta="Plan B ante la tentación" ayuda="Qué hacés en lugar de caer. Te lo recuerdo en Hoy.">
          <input value={versionMinima} onChange={(e) => setVersionMinima(e.target.value)} className={inputClase} placeholder="Ej. Tener una comida congelada lista" />
        </Campo>
      ) : (
        <Campo etiqueta="Versión mínima" ayuda="Lo mínimo que cuenta en un día difícil. Nunca dos días seguidos sin hacerlo.">
          <input value={versionMinima} onChange={(e) => setVersionMinima(e.target.value)} className={inputClase} placeholder="Ej. Leer 2 páginas" />
        </Campo>
      )}

      <fieldset>
        <legend className="mb-1 text-sm text-slate-400">Metas a las que contribuye</legend>
        <div className="space-y-1">
          {objetivos.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={vinculados.includes(o.id)} onChange={() => setVinculados((x) => alternar(x, o.id))} className="accent-emerald-500" />
              {o.titulo}
            </label>
          ))}
          {objetivos.length === 0 && <p className="text-sm text-slate-500">Todavía no tenés metas.</p>}
        </div>
      </fieldset>

      {id && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="accent-emerald-500" />
          Activo (desmarcalo para pausarlo sin perder su historial)
        </label>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <BotonPrimario type="submit" disabled={guardando}>
          Guardar
        </BotonPrimario>
        {id && (
          <BotonSecundario type="button" onClick={() => void eliminar()}>
            Eliminar
          </BotonSecundario>
        )}
      </div>
    </form>
  )
}
