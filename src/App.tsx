import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './lib/auth'
import { useCicloActivo } from './lib/datos'
import { supabaseConfigurado } from './lib/supabase'
import Ajustes from './pages/Ajustes'
import Bienvenida from './pages/Bienvenida'
import Hoy from './pages/Hoy'
import Login from './pages/Login'
import Metas from './pages/Metas'
import Revision from './pages/Revision'
import SinConfigurar from './pages/SinConfigurar'

function Cargando() {
  return <p className="p-6 text-slate-500">Cargando…</p>
}

function AppConSesion() {
  const { ciclo, cargando, recargar } = useCicloActivo()
  if (cargando) return <Cargando />

  return (
    <Routes>
      <Route element={<Layout />}>
        {ciclo ? (
          <>
            <Route index element={<Hoy ciclo={ciclo} />} />
            <Route path="metas" element={<Metas ciclo={ciclo} />} />
          </>
        ) : (
          <Route index element={<Bienvenida alCrear={() => void recargar()} />} />
        )}
        <Route path="revision" element={<Revision />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Bienvenida alCrear={() => void recargar()} />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const { session, cargando } = useAuth()
  if (!supabaseConfigurado) return <SinConfigurar />
  if (cargando) return <Cargando />
  if (!session) return <Login />
  return <AppConSesion />
}
