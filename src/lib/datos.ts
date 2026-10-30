import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface Ciclo {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
}

export interface Objetivo {
  id: string
  codigo: string | null
  titulo: string
  descripcion: string | null
  tipo: 'meta_numerica' | 'conteo' | 'promedio' | 'proyecto'
  unidad: string | null
  valor_inicial: number | null
  valor_meta: number | null
  dimension_id: string | null
}

export interface Dimension {
  id: string
  nombre: string
  orden: number
}

export interface Habito {
  id: string
  titulo: string
  frecuencia: { tipo: 'dias'; dias: number[] } | { tipo: 'veces_semana'; veces: number }
  hora: string | null
  duracion_min: number | null
  version_minima: string | null
}

/** Ciclo activo más reciente del usuario, o null si todavía no creó ninguno */
export function useCicloActivo() {
  const [ciclo, setCiclo] = useState<Ciclo | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    setCargando(true)
    const { data } = await supabase
      .from('ciclos')
      .select('id, nombre, fecha_inicio, fecha_fin')
      .eq('estado', 'activo')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()
    setCiclo(data)
    setCargando(false)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { ciclo, cargando, recargar }
}

/** Día del ciclo (1 = primer día) y total de días */
export function diaDelCiclo(ciclo: Ciclo, hoy = new Date()) {
  const inicio = Date.parse(ciclo.fecha_inicio + 'T00:00:00')
  const fin = Date.parse(ciclo.fecha_fin + 'T00:00:00')
  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
  const total = Math.round((fin - inicio) / 864e5) + 1
  const dia = Math.round((hoy0 - inicio) / 864e5) + 1
  return { dia: Math.min(Math.max(dia, 0), total + 1), total }
}

/** Hábitos que corresponden a un día. Los de "N veces por semana" aparecen siempre como opcionales. */
export function habitosDelDia(habitos: Habito[], fecha = new Date()) {
  const dia = fecha.getDay()
  return habitos
    .filter((h) => h.frecuencia.tipo === 'veces_semana' || h.frecuencia.dias.includes(dia))
    .sort((a, b) => (a.hora ?? '99').localeCompare(b.hora ?? '99'))
}
