import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { calcularLogros } from '../lib/logros'

type Logros = ReturnType<typeof calcularLogros>

const CLAVE_VISTAS = 'rumbo90.insignias.vistas'

function leerVistas(): string[] | null {
  try {
    const v = localStorage.getItem(CLAVE_VISTAS)
    return v ? (JSON.parse(v) as string[]) : null
  } catch {
    return null
  }
}

function guardarVistas(ids: string[]) {
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify(ids))
  } catch {
    // sin almacenamiento local: solo se pierde el aviso de insignia nueva
  }
}

/** Nivel, puntos y racha, arriba de Hoy */
export function TarjetaNivel({ logros }: { logros: Logros }) {
  const { xp, nivel, siguiente, racha } = logros
  const avance = siguiente ? (xp - nivel.desde) / (siguiente.desde - nivel.desde) : 1
  return (
    <Link to="/logros" className="mt-4 block rounded-xl border border-slate-800 p-4 active:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Nivel</p>
          <p className="font-semibold">{nivel.nombre}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums">
            🔥 {racha.actual} {racha.actual === 1 ? 'día' : 'días'}
          </p>
          <p className="text-xs text-slate-500">racha (récord {racha.maxima})</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-violet-400" style={{ width: `${Math.round(avance * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {xp} puntos{siguiente ? ` · ${siguiente.desde - xp} para ${siguiente.nombre}` : ' · nivel máximo'} · Ver logros →
      </p>
    </Link>
  )
}

const ESTILO = {
  festejo: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  aviso: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  reto: 'border-violet-400/40 bg-violet-400/10 text-violet-100',
}
const ICONO = { festejo: '🎉', aviso: '💡', reto: '🎯' }

/** Mensajes del coach: avisos cuando venís mal y retos, siempre en tono positivo */
export function MensajesCoach({ logros }: { logros: Logros }) {
  return (
    <ul className="mt-4 space-y-2">
      {logros.mensajes.map((m) => (
        <li key={m.texto} className={`flex gap-2 rounded-xl border p-3 text-sm ${ESTILO[m.tipo]}`}>
          <span aria-hidden>{ICONO[m.tipo]}</span>
          <span>{m.texto}</span>
        </li>
      ))}
    </ul>
  )
}

/** Aviso flotante cuando se desbloquea una insignia nueva */
export function AvisoInsignias({ logros }: { logros: Logros }) {
  const [nueva, setNueva] = useState<{ emoji: string; nombre: string } | null>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const logradas = logros.insignias.filter((i) => i.lograda)
  const clave = logradas.map((i) => i.id).join(',')

  useEffect(() => {
    const ids = clave ? clave.split(',') : []
    const vistas = leerVistas()
    guardarVistas(ids)
    // La primera vez solo se toma nota, para no festejar de golpe todo lo anterior
    if (vistas == null) return
    const id = ids.find((x) => !vistas.includes(x))
    const insignia = logros.insignias.find((i) => i.id === id)
    if (!insignia) return
    setNueva({ emoji: insignia.emoji, nombre: insignia.nombre })
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setNueva(null), 4000)
  }, [clave, logros.insignias])

  if (!nueva) return null
  return (
    <div className="fixed inset-x-0 bottom-24 z-10 flex justify-center px-4">
      <div className="animate-bounce rounded-2xl border border-violet-400/60 bg-slate-900 px-5 py-3 text-center shadow-lg">
        <p className="text-3xl">{nueva.emoji}</p>
        <p className="text-sm text-slate-400">¡Nueva insignia!</p>
        <p className="font-semibold">{nueva.nombre}</p>
      </div>
    </div>
  )
}
