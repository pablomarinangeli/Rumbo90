import { fechaISO } from './datos'

/** Primer día del mes de una fecha, en AAAA-MM-DD */
export function inicioDeMes(fecha = new Date()) {
  return fechaISO(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
}

export function mesAnterior(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  return fechaISO(new Date(a, m - 2, 1))
}

export function nombreDelMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export interface Evaluacion {
  id: string
  dimension_id: string
  mes: string
  puntaje: number
}
