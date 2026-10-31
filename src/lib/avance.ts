import type { Hito, Medicion, Objetivo } from './datos'

export interface Avance {
  /** 0 a 1, o null si faltan datos para calcularlo */
  porcentaje: number | null
  actual: number | null
  detalle: string
}

const limitar = (x: number) => Math.min(Math.max(x, 0), 1)

/**
 * Avance según el tipo de objetivo, sin mezclar unidades:
 * - meta_numerica y promedio: distancia recorrida entre el valor inicial y la meta, con la última medición
 * - conteo: última medición sobre la meta (las mediciones guardan el total acumulado)
 * - proyecto: hitos hechos sobre el total
 */
export function calcularAvance(o: Objetivo, mediciones: Medicion[], hitos: Hito[]): Avance {
  if (o.tipo === 'proyecto') {
    const hechos = hitos.filter((h) => h.estado === 'hecho').length
    return {
      porcentaje: hitos.length ? hechos / hitos.length : null,
      actual: hechos,
      detalle: hitos.length ? `${hechos} de ${hitos.length} hitos` : 'Sin hitos todavía',
    }
  }

  const ultima = [...mediciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).at(0)
  const actual = ultima?.valor ?? null
  const unidad = o.unidad ? ` ${o.unidad}` : ''

  if (o.valor_meta == null) {
    return { porcentaje: null, actual, detalle: 'Falta definir la meta' }
  }
  if (actual == null) {
    return { porcentaje: null, actual, detalle: 'Sin mediciones todavía' }
  }
  if (o.tipo === 'conteo') {
    return {
      porcentaje: o.valor_meta ? limitar(actual / o.valor_meta) : null,
      actual,
      detalle: `${actual} de ${o.valor_meta}${unidad}`,
    }
  }
  if (o.valor_inicial == null || o.valor_inicial === o.valor_meta) {
    return { porcentaje: null, actual, detalle: `Actual: ${actual}${unidad}` }
  }
  return {
    porcentaje: limitar((actual - o.valor_inicial) / (o.valor_meta - o.valor_inicial)),
    actual,
    detalle: `Actual: ${actual}${unidad} · meta ${o.valor_meta}${unidad}`,
  }
}
