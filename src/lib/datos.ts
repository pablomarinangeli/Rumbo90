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
  subcategoria_id: string | null
}

export type EstadoCategoria = 'prioritaria' | 'mantenimiento' | 'sin_foco'

/** Categoría de vida (en la base se llama dimensión) */
export interface Dimension {
  id: string
  nombre: string
  orden: number
  estado?: EstadoCategoria
  descripcion?: string | null
}

export interface Subcategoria {
  id: string
  dimension_id: string
  nombre: string
  orden: number
}

export const DIMENSION_CAMPOS = 'id, nombre, orden, estado, descripcion'

export const ESTADOS_CATEGORIA: Record<EstadoCategoria, { nombre: string; ayuda: string; clase: string }> = {
  prioritaria: { nombre: 'Prioritaria', ayuda: 'Metas activas, compromisos frecuentes y seguimiento semanal.', clase: 'border-emerald-500 text-emerald-400' },
  mantenimiento: { nombre: 'Mantenimiento', ayuda: 'Hábitos mínimos para sostener lo conseguido.', clase: 'border-sky-400 text-sky-300' },
  sin_foco: { nombre: 'Sin foco', ayuda: 'No exige acciones. Queda disponible para más adelante.', clase: 'border-slate-600 text-slate-400' },
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
  /** construir = hábito bueno; reducir = hábito malo a reducir o eliminar */
  tipo: 'construir' | 'reducir'
  /** Solo para reducir: máximo por semana (0 = eliminar) */
  limite_semana: number | null
  created_at: string
}

export interface RegistroHabito {
  id: string
  habito_id: string
  fecha: string
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

export const HABITO_CAMPOS = 'id, titulo, frecuencia, hora, duracion_min, version_minima, activo, tipo, limite_semana, created_at'
export const OBJETIVO_CAMPOS =
  'id, codigo, titulo, descripcion, tipo, unidad, valor_inicial, valor_meta, dimension_id, subcategoria_id'

/** Fecha local en formato AAAA-MM-DD (en-CA usa ese formato) */
export function fechaISO(fecha = new Date()) {
  return fecha.toLocaleDateString('en-CA')
}

/** Lunes de la semana de una fecha, en AAAA-MM-DD */
export function inicioSemana(fecha = new Date()) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return fechaISO(d)
}

/** Días enteros entre dos fechas AAAA-MM-DD */
export function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(hasta + 'T00:00:00') - Date.parse(desde + 'T00:00:00')) / 864e5)
}

export function describirLimite(limite: number | null) {
  if (!limite) return 'Eliminar (0 por semana)'
  return `Máximo ${limite} ${limite === 1 ? 'vez' : 'veces'} por semana`
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

/**
 * Hábitos en pausa: los que solo empujan metas de categorías "sin foco".
 * Esas categorías no exigen acciones, así que sus hábitos no aparecen en Hoy ni cuentan en el cumplimiento.
 */
export async function habitosEnPausa(cicloId: string) {
  const { data: dims } = await supabase.from('dimensiones').select('id').eq('ciclo_id', cicloId).eq('estado', 'sin_foco')
  if (!dims?.length) return new Set<string>()
  const { data: objs } = await supabase.from('objetivos').select('id, dimension_id').eq('ciclo_id', cicloId)
  const pausados = new Set((objs ?? []).filter((o) => dims.some((d) => d.id === o.dimension_id)).map((o) => o.id))
  if (!pausados.size) return new Set<string>()
  const { data: vinculos } = await supabase.from('habitos_objetivos').select('habito_id, objetivo_id')
  const porHabito = new Map<string, string[]>()
  for (const v of vinculos ?? []) porHabito.set(v.habito_id, [...(porHabito.get(v.habito_id) ?? []), v.objetivo_id])
  return new Set([...porHabito].filter(([, objetivos]) => objetivos.every((o) => pausados.has(o))).map(([h]) => h))
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

/** Hábitos a construir que corresponden a un día. Los de "N veces por semana" aparecen siempre como opcionales. */
export function habitosDelDia(habitos: Habito[], fecha = new Date()) {
  const dia = fecha.getDay()
  return habitos
    .filter((h) => h.tipo !== 'reducir')
    .filter((h) => h.frecuencia.tipo === 'veces_semana' || h.frecuencia.dias.includes(dia))
    .sort((a, b) => (a.hora ?? '99').localeCompare(b.hora ?? '99'))
}
