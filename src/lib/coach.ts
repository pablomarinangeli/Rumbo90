import type Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'

export type MensajeCoach = Anthropic.UserMessageParam | Anthropic.AssistantMessageParam
export type BloqueCoach = Anthropic.ContentBlock
export type BloquesUsuario = Exclude<Anthropic.UserMessageParam['content'], string>
export type BloquesCoach = Exclude<Anthropic.AssistantMessageParam['content'], string>

export interface MetaPropuesta {
  titulo: string
  dimension: string
  tipo: 'meta_numerica' | 'conteo' | 'promedio' | 'proyecto'
  unidad: string | null
  valor_inicial: number | null
  valor_meta: number | null
  descripcion: string | null
}

export interface HabitoPropuesto {
  titulo: string
  tipo: 'construir' | 'reducir'
  dias: number[] | null
  veces_semana: number | null
  limite_semana: number | null
  version_minima: string | null
  metas: string[]
  porque: string
}

export interface PropuestaMetas {
  resumen: string
  metas: MetaPropuesta[]
}

export interface PropuestaHabitos {
  resumen: string
  habitos: HabitoPropuesto[]
}

export type Propuesta =
  | { id: string; tipo: 'metas'; datos: PropuestaMetas }
  | { id: string; tipo: 'habitos'; datos: PropuestaHabitos }

const CLAVE = 'rumbo90.coach.conversacion'

export function leerConversacion(): MensajeCoach[] {
  try {
    const v = localStorage.getItem(CLAVE)
    return v ? (JSON.parse(v) as MensajeCoach[]) : []
  } catch {
    return []
  }
}

export function guardarConversacion(m: MensajeCoach[]) {
  try {
    if (m.length) localStorage.setItem(CLAVE, JSON.stringify(m))
    else localStorage.removeItem(CLAVE)
  } catch {
    // sin almacenamiento: la conversación vive solo mientras la pantalla está abierta
  }
}

/** Envía la conversación al coach y devuelve los bloques de su respuesta */
export async function hablarConCoach(mensajes: MensajeCoach[], contexto: string) {
  const { data, error } = await supabase.functions.invoke('coach', { body: { mensajes, contexto } })
  if (error) {
    // El cuerpo del error trae un mensaje amable armado por la función
    let texto = 'El coach no está disponible ahora. Probá de nuevo en un rato.'
    try {
      const cuerpo = await (error as { context?: Response }).context?.json()
      if (cuerpo?.error) texto = cuerpo.error
    } catch {
      // sin cuerpo legible
    }
    throw new Error(texto)
  }
  if (data?.error) throw new Error(data.error as string)
  return data.content as BloqueCoach[]
}

/** Propuesta (de metas o de hábitos) que el coach hizo en un turno, si la hay */
export function propuestaDe(contenido: MensajeCoach['content']): Propuesta | null {
  if (typeof contenido === 'string') return null
  for (const b of contenido) {
    if (b.type !== 'tool_use') continue
    if (b.name === 'proponer_metas') return { id: b.id, tipo: 'metas', datos: b.input as PropuestaMetas }
    if (b.name === 'proponer_habitos') return { id: b.id, tipo: 'habitos', datos: b.input as PropuestaHabitos }
  }
  return null
}

export function textoDe(contenido: MensajeCoach['content']) {
  if (typeof contenido === 'string') return contenido
  const partes: string[] = []
  for (const b of contenido ?? []) if (b.type === 'text' && 'text' in b) partes.push(b.text)
  return partes.join('\n')
}
