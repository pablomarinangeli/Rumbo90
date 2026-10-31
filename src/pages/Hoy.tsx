import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AvisoInsignias, MensajesCoach, TarjetaNivel } from '../components/Coach'
import HabitosAReducir from '../components/HabitosAReducir'
import { BarraAvance } from '../components/ui'
import {
  HABITO_CAMPOS,
  diaDelCiclo,
  fechaISO,
  habitosDelDia,
  type Ciclo,
  type Compromiso,
  type EstadoCompromiso,
  type Habito,
} from '../lib/datos'
import { calcularLogros, useHistorial } from '../lib/logros'
import { supabase } from '../lib/supabase'

const OPCIONES: { estado: EstadoCompromiso; etiqueta: string; clase: string }[] = [
  { estado: 'realizado', etiqueta: 'Hecho', clase: 'border-emerald-500 bg-emerald-500 text-slate-950' },
  { estado: 'parcial', etiqueta: 'Parcial', clase: 'border-amber-400 bg-amber-400 text-slate-950' },
  { estado: 'reprogramado', etiqueta: 'Pospuesto', clase: 'border-sky-400 bg-sky-400 text-slate-950' },
  { estado: 'omitido', etiqueta: 'No hecho', clase: 'border-slate-400 bg-slate-400 text-slate-950' },
]

const PESO: Partial<Record<EstadoCompromiso, number>> = { realizado: 1, parcial: 0.5 }

const COMPROMISO_CAMPOS = 'id, client_id, fecha, titulo, habito_id, estado, motivo'

export default function Hoy({ ciclo }: { ciclo: Ciclo }) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [compromisos, setCompromisos] = useState<Compromiso[]>([])
  const [fallidosAyer, setFallidosAyer] = useState<string[]>([])
  const hoy = fechaISO()
  const { dia, total } = diaDelCiclo(ciclo)
  const { historial, recargar: recargarHistorial } = useHistorial(ciclo)
  const logros = historial ? calcularLogros(historial) : null
  const fechaTexto = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const cargar = useCallback(async () => {
    const ayer = fechaISO(new Date(Date.now() - 864e5))
    const [h, c, a] = await Promise.all([
      supabase.from('habitos').select(HABITO_CAMPOS).eq('ciclo_id', ciclo.id).eq('activo', true),
      supabase.from('compromisos').select(COMPROMISO_CAMPOS).eq('fecha', hoy),
      supabase.from('compromisos').select('habito_id').eq('fecha', ayer).eq('estado', 'omitido'),
    ])
    setHabitos((h.data ?? []) as Habito[])
    setCompromisos((c.data ?? []) as Compromiso[])
    setFallidosAyer((a.data ?? []).map((x) => x.habito_id).filter((x): x is string => Boolean(x)))
    void recargarHistorial()
  }, [ciclo.id, hoy, recargarHistorial])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const delDia = habitosDelDia(habitos)
  const compromisoDe = (h: Habito) => compromisos.find((c) => c.habito_id === h.id)

  const marcar = async (h: Habito, estado: EstadoCompromiso) => {
    const actual = compromisoDe(h)
    const nuevo = actual?.estado === estado ? 'pendiente' : estado
    // Actualización optimista: la pantalla responde al instante
    setCompromisos((cs) =>
      actual
        ? cs.map((c) => (c.id === actual.id ? { ...c, estado: nuevo } : c))
        : [...cs, { id: crypto.randomUUID(), client_id: '', fecha: hoy, titulo: h.titulo, habito_id: h.id, estado: nuevo, motivo: null }],
    )
    if (actual) {
      await supabase.from('compromisos').update({ estado: nuevo }).eq('id', actual.id)
    } else {
      await supabase.from('compromisos').insert({
        client_id: crypto.randomUUID(),
        fecha: hoy,
        hora: h.hora,
        duracion_min: h.duracion_min,
        titulo: h.titulo,
        habito_id: h.id,
        estado: nuevo,
      })
    }
    void cargar()
  }

  const guardarMotivo = async (c: Compromiso, motivo: string) => {
    if ((c.motivo ?? '') === motivo) return
    await supabase.from('compromisos').update({ motivo: motivo || null }).eq('id', c.id)
    void cargar()
  }

  const cumplimiento = delDia.length
    ? delDia.reduce((suma, h) => suma + (PESO[compromisoDe(h)?.estado ?? 'pendiente'] ?? 0), 0) / delDia.length
    : null

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-slate-500">{fechaTexto}</p>
      <h1 className="mt-1 text-2xl font-bold">Mis compromisos</h1>
      <p className="mt-1 text-sm text-slate-400">
        Día {dia} de {total} · {ciclo.nombre}
      </p>

      {logros && <TarjetaNivel logros={logros} />}
      {logros && <MensajesCoach logros={logros} />}
      {logros && <AvisoInsignias logros={logros} />}

      {cumplimiento != null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-400">Cumplimiento de hoy</span>
            <span className="font-semibold tabular-nums">{Math.round(cumplimiento * 100)}%</span>
          </div>
          <BarraAvance valor={cumplimiento} />
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {delDia.map((h) => {
          const c = compromisoDe(h)
          const estado = c?.estado ?? 'pendiente'
          const recuperar = fallidosAyer.includes(h.id) && estado === 'pendiente'
          const rachaH = logros?.rachasHabito.get(h.id)
          return (
            <li key={h.id} className="rounded-xl border border-slate-800 p-4">
              <div className="flex items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-sm tabular-nums text-slate-500">{h.hora?.slice(0, 5) ?? '—'}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${estado === 'realizado' ? 'text-slate-500 line-through' : ''}`}>
                    {h.titulo}
                    {rachaH && rachaH.actual >= 2 && (
                      <span className="ml-2 text-xs font-normal text-orange-300">🔥 {rachaH.actual}</span>
                    )}
                  </p>
                  {h.version_minima && (
                    <p className={`mt-0.5 text-sm ${recuperar ? 'text-amber-300' : 'text-slate-500'}`}>
                      {recuperar ? 'Ayer no salió. Hoy alcanza con: ' : 'Versión mínima: '}
                      {h.version_minima}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {OPCIONES.map((o) => (
                  <button
                    key={o.estado}
                    onClick={() => void marcar(h, o.estado)}
                    className={`rounded-lg border py-1.5 text-xs ${estado === o.estado ? `${o.clase} font-semibold` : 'border-slate-700 text-slate-400'}`}
                  >
                    {o.etiqueta}
                  </button>
                ))}
              </div>
              {c && (estado === 'reprogramado' || estado === 'omitido') && (
                <input
                  defaultValue={c.motivo ?? ''}
                  onBlur={(e) => void guardarMotivo(c, e.target.value.trim())}
                  placeholder="Motivo (opcional)"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-transparent px-3 py-1.5 text-sm text-slate-300 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
              )}
            </li>
          )
        })}
        {delDia.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-700 p-4 text-slate-400">
            No hay hábitos para hoy. <Link to="/coach" className="text-violet-300">Armalos con el coach</Link> o{' '}
            <Link to="/habitos/nuevo" className="text-emerald-400">creá uno</Link> y va a aparecer acá los días que corresponda.
          </li>
        )}
      </ul>

      <HabitosAReducir habitos={habitos.filter((h) => h.tipo === 'reducir')} alCambiar={recargarHistorial} />
    </div>
  )
}
