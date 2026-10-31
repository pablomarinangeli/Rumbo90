import { useCallback, useEffect, useState } from 'react'
import { diasEntre, describirLimite, fechaISO, inicioSemana, type Habito, type RegistroHabito } from '../lib/datos'
import { supabase } from '../lib/supabase'

const SEMANAS_PREVIAS = 4

function semaforo(n: number, limite: number) {
  if (n > limite) return { clase: 'border-rose-500/60 bg-rose-500/10', texto: `Te pasaste por ${n - limite}`, color: 'text-rose-300' }
  if (limite === 0) return { clase: 'border-emerald-500/40', texto: 'Semana limpia', color: 'text-emerald-400' }
  if (n === limite) return { clase: 'border-amber-400/60 bg-amber-400/10', texto: 'Llegaste al límite', color: 'text-amber-300' }
  const quedan = limite - n
  return { clase: 'border-emerald-500/40', texto: `Te ${quedan === 1 ? 'queda' : 'quedan'} ${quedan}`, color: 'text-emerald-400' }
}

/** Hábitos malos: contador semanal contra el límite, días sin caer y tendencia de las semanas anteriores */
export default function HabitosAReducir({ habitos, alCambiar }: { habitos: Habito[]; alCambiar?: () => void }) {
  const [registros, setRegistros] = useState<RegistroHabito[]>([])
  const hoy = fechaISO()
  const lunes = inicioSemana()
  const ids = habitos.map((h) => h.id).join(',')

  const cargar = useCallback(async () => {
    if (!ids) return
    const desde = fechaISO(new Date(Date.now() - 90 * 864e5))
    const { data } = await supabase
      .from('registros_habito')
      .select('id, habito_id, fecha')
      .in('habito_id', ids.split(','))
      .gte('fecha', desde)
      .order('created_at')
    setRegistros((data ?? []) as RegistroHabito[])
  }, [ids])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const sumar = async (h: Habito) => {
    const nuevo = { id: crypto.randomUUID(), habito_id: h.id, fecha: hoy }
    setRegistros((r) => [...r, nuevo])
    await supabase.from('registros_habito').insert({ client_id: crypto.randomUUID(), habito_id: h.id, fecha: hoy })
    void cargar()
    alCambiar?.()
  }

  const deshacer = async (ultimoDeHoy: RegistroHabito) => {
    setRegistros((r) => r.filter((x) => x.id !== ultimoDeHoy.id))
    await supabase.from('registros_habito').delete().eq('id', ultimoDeHoy.id)
    void cargar()
    alCambiar?.()
  }

  if (habitos.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-rose-300">A reducir o eliminar</h2>
      <p className="mt-1 text-sm text-slate-400">Tocá +1 cada vez que pase. Cuanto menos, mejor.</p>
      <ul className="mt-3 space-y-3">
        {habitos.map((h) => {
          const propios = registros.filter((r) => r.habito_id === h.id)
          const limite = h.limite_semana ?? 0
          const estaSemana = propios.filter((r) => r.fecha >= lunes).length
          const deHoy = propios.filter((r) => r.fecha === hoy)
          const ultimo = propios.at(-1)?.fecha
          const diasSin = ultimo ? diasEntre(ultimo, hoy) : null
          const previas = Array.from({ length: SEMANAS_PREVIAS }, (_, i) => {
            const fin = fechaISO(new Date(Date.parse(lunes + 'T00:00:00') - i * 7 * 864e5))
            const ini = fechaISO(new Date(Date.parse(lunes + 'T00:00:00') - (i + 1) * 7 * 864e5))
            return propios.filter((r) => r.fecha >= ini && r.fecha < fin).length
          }).reverse()
          const s = semaforo(estaSemana, limite)
          return (
            <li key={h.id} className={`rounded-xl border p-4 ${s.clase}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{h.titulo}</p>
                  <p className="text-sm text-slate-400">{describirLimite(h.limite_semana)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">
                    {estaSemana}
                    <span className="text-base font-normal text-slate-500"> / {limite}</span>
                  </p>
                  <p className={`text-xs ${s.color}`}>{s.texto}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {diasSin == null ? 'Todavía sin registros' : diasSin === 0 ? 'Pasó hoy' : `${diasSin} ${diasSin === 1 ? 'día' : 'días'} sin`}
                {propios.length > 0 && ` · Semanas anteriores: ${previas.join(' · ')}`}
              </p>
              {h.version_minima && <p className="mt-1 text-sm text-slate-500">Plan B: {h.version_minima}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void sumar(h)}
                  className="flex-1 rounded-lg border border-rose-400/60 py-1.5 text-sm font-semibold text-rose-300 active:bg-rose-500/10"
                >
                  +1 hoy
                </button>
                {deHoy.length > 0 && (
                  <button
                    onClick={() => void deshacer(deHoy.at(-1)!)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400"
                  >
                    Deshacer ({deHoy.length} hoy)
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
