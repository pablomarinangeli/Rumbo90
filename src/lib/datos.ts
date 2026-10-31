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

export type Frecuencia = { tipo: 'dias'; dias: number[] } | { tipo: 'veces_semana'; veces: number }

export interface Habito {
  id: string
  titulo: string
  frecuencia: Frecuencia
  hora: string | null
  duracion_min: number | null
  version_minima: string | null
  activo: boolean
}

export type EstadoCompromiso = 'pendiente' | 'realizado' | 'parcial' | 'reprogramado' | 'omitido' | 'cancelado'

export interface Compromiso {
  id: string
  client_id: string
  fecha: string
  titulo: string
  habito_id: string | null
  estado: EstadoCompromiso
  motivo: string | null
}

export interface Medicion {
  id: string
  objetivo_id: string
  fecha: string
  valor: number
  unidad: string | null
  nota: string | null
}

export interface Hito {
  id: string
  objetivo_id: string
  titulo: string
  fecha: string | null
  estado: 'pendiente' | 'en_curso' | 'hecho' | 'bloqueado'
  orden: number
}

export const HABITO_CAMPOS = 'id, titulo, frecuencia, hora, duracion_min, version_minima, activo'
export const OBJETIVO_CAMPOS =
  'id, codigo, titulo, descripcion, tipo, unidad, valor_inicial, valor_meta, dimension_id'

/** Fecha local en formato AAAA-MM-DD (en-CA usa ese formato) */
export function fechaISO(fecha = new Date()) {
  return fecha.toLocaleDateString('en-CA')
}

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function describirFrecuencia(f: Frecuencia) {
  if (f.tipo === 'veces_semana') return `${f.veces} ${f.veces === 1 ? 'vez' : 'veces'} por semana`
  if (f.dias.length === 7) return 'Todos los días'
  return [...f.dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DIAS_CORTOS.at(d)).join(' · ')
}

export const TIPOS_OBJETIVO: Record<Objetivo['tipo'], string> = {
  meta_numerica: 'Meta numérica (ej. peso)',
  conteo: 'Conteo (ej. libros terminados)',
  promedio: 'Promedio (ej. horas por semana)',
  proyecto: 'Proyecto con hitos',
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
