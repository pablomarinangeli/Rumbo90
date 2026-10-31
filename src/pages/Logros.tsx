import { NIVELES, XP, calcularLogros, useHistorial } from '../lib/logros'
import type { Ciclo } from '../lib/datos'

export default function Logros({ ciclo }: { ciclo: Ciclo }) {
  const { historial } = useHistorial(ciclo)
  if (!historial) return <p className="text-slate-500">Cargando…</p>
  const l = calcularLogros(historial)
  const logradas = l.insignias.filter((i) => i.lograda).length

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis logros</h1>
      <p className="mt-1 text-sm text-slate-400">Se premia la constancia, no la perfección.</p>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-slate-800 p-3">
          <p className="text-2xl font-bold tabular-nums">{l.xp}</p>
          <p className="text-xs text-slate-500">puntos</p>
        </div>
        <div className="rounded-xl border border-slate-800 p-3">
          <p className="text-2xl font-bold tabular-nums">🔥 {l.racha.actual}</p>
          <p className="text-xs text-slate-500">racha (récord {l.racha.maxima})</p>
        </div>
        <div className="rounded-xl border border-slate-800 p-3">
          <p className="text-2xl font-bold tabular-nums">{l.semanasExito}</p>
          <p className="text-xs text-slate-500">semanas ganadas</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold">Insignias · {logradas} de {l.insignias.length}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {l.insignias.map((i) => (
            <li key={i.id} className={`rounded-xl border p-3 ${i.lograda ? 'border-violet-400/50 bg-violet-400/10' : 'border-slate-800 opacity-50'}`}>
              <p className={`text-2xl ${i.lograda ? '' : 'grayscale'}`}>{i.lograda ? i.emoji : '🔒'}</p>
              <p className="mt-1 text-sm font-semibold">{i.nombre}</p>
              <p className="text-xs text-slate-400">{i.descripcion}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Niveles</h2>
        <ol className="mt-3 space-y-1 text-sm">
          {NIVELES.map((n) => (
            <li key={n.nombre} className={`flex justify-between ${n.nombre === l.nivel.nombre ? 'font-semibold text-violet-300' : 'text-slate-400'}`}>
              <span>{n.nombre}</span>
              <span className="tabular-nums">{n.desde} pts</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 p-4 text-sm text-slate-400">
        <h2 className="font-semibold text-slate-200">Cómo se suman puntos</h2>
        <ul className="mt-2 space-y-1">
          <li>Compromiso hecho: {XP.realizado} · parcial: {XP.parcial}</li>
          <li>Día perfecto (todo en Hecho): +{XP.diaPerfecto}</li>
          <li>Semana dentro del límite en un hábito a reducir: +{XP.semanaEnLimite} (en cero: +{XP.semanaLimpia})</li>
          <li>La racha cuenta los días en que cumplís al menos la mitad. Un mal día aislado no la corta: dos seguidos, sí.</li>
        </ul>
      </section>
    </div>
  )
}
