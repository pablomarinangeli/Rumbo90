export type TipoObjetivo = 'meta_numerica' | 'conteo' | 'promedio' | 'proyecto'

export interface PlantillaHabito {
  titulo: string
  frecuencia: { tipo: 'dias'; dias: number[] } | { tipo: 'veces_semana'; veces: number }
  hora?: string
  duracion_min?: number
  unidad?: string
  meta_por_vez?: number
  version_minima?: string
  /** Códigos de los objetivos a los que contribuye */
  objetivos: string[]
}

export interface PlantillaObjetivo {
  codigo: string
  titulo: string
  descripcion?: string
  tipo: TipoObjetivo
  unidad?: string
  valor_inicial?: number
  valor_meta?: number
  hitos?: string[]
}

export interface PlantillaCiclo {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  dimensiones: { nombre: string; objetivos: PlantillaObjetivo[] }[]
  habitos: PlantillaHabito[]
}
