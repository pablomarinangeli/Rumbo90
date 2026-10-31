import { NavLink, Outlet } from 'react-router-dom'

const secciones = [
  { to: '/', etiqueta: 'Hoy' },
  { to: '/metas', etiqueta: 'Metas' },
  { to: '/habitos', etiqueta: 'Hábitos' },
  { to: '/logros', etiqueta: 'Logros' },
  { to: '/ajustes', etiqueta: 'Ajustes' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <main className="flex-1 px-4 pb-28 pt-6">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {secciones.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                end={s.to === '/'}
                className={({ isActive }) =>
                  `block py-4 text-center text-sm ${isActive ? 'font-semibold text-emerald-400' : 'text-slate-400'}`
                }
              >
                {s.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
