import type { ReactNode } from 'react'

export const inputClase =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none'

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-400">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  )
}

export function BotonPrimario({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 active:bg-emerald-400 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function BotonSecundario({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="rounded-xl border border-slate-700 px-4 py-2.5 text-slate-300 disabled:opacity-50">
      {children}
    </button>
  )
}

export function BarraAvance({ valor }: { valor: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      {valor != null && <div className="h-full bg-emerald-500" style={{ width: `${Math.round(valor * 100)}%` }} />}
    </div>
  )
}

export function Volver({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-4 text-sm text-slate-400">
      ← Volver
    </button>
  )
}
