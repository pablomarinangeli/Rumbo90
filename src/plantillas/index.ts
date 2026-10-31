import type { PlantillaCiclo } from './tipos'

const TODOS = [0, 1, 2, 3, 4, 5, 6]

function rango(desde: Date, dias: number) {
  // en-CA formatea como AAAA-MM-DD en la zona horaria local
  const fin = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + dias - 1)
  return { fecha_inicio: desde.toLocaleDateString('en-CA'), fecha_fin: fin.toLocaleDateString('en-CA') }
}

/**
 * Ciclo de ejemplo con las tres dimensiones de Rumbo 90. Las metas no traen
 * valores personales: cada usuario completa sus valores iniciales y finales.
 */
export function cicloEjemplo(desde = new Date()): PlantillaCiclo {
  return {
    nombre: 'Mi ciclo Rumbo 90',
    ...rango(desde, 90),
    dimensiones: [
      {
        nombre: 'Salud y condición física',
        objetivos: [
          { codigo: 'H1', titulo: 'Mejorar mi composición corporal', tipo: 'meta_numerica', unidad: 'kg' },
          {
            codigo: 'H2',
            titulo: 'Mejorar mi condición física',
            descripcion: 'Por ejemplo, VO₂ máx. o sesiones de actividad por semana',
            tipo: 'promedio',
          },
        ],
      },
      {
        nombre: 'Desarrollo personal',
        objetivos: [
          { codigo: 'D1', titulo: 'Completar cursos de aprendizaje', tipo: 'conteo', unidad: 'cursos', valor_inicial: 0 },
          { codigo: 'D2', titulo: 'Reemplazar redes por lectura', tipo: 'conteo', unidad: 'libros', valor_inicial: 0 },
        ],
      },
      {
        nombre: 'Desarrollo profesional',
        objetivos: [
          {
            codigo: 'P1',
            titulo: 'Dedicar más tiempo a estrategia y menos a operación',
            tipo: 'promedio',
            unidad: 'horas estratégicas por semana',
            valor_inicial: 0,
          },
          { codigo: 'P2', titulo: 'Proyecto estratégico principal', tipo: 'proyecto' },
        ],
      },
    ],
    habitos: [
      {
        titulo: 'Bloque estratégico',
        frecuencia: { tipo: 'dias', dias: [1, 2, 3, 4, 5] },
        hora: '09:00',
        duracion_min: 90,
        version_minima: '25 minutos sin interrupciones',
        objetivos: ['P1', 'P2'],
      },
      {
        titulo: 'Registrar alimentación',
        frecuencia: { tipo: 'dias', dias: TODOS },
        hora: '14:00',
        version_minima: 'Anotar solo la comida principal',
        objetivos: ['H1'],
      },
      {
        titulo: 'Actividad o recuperación programada',
        frecuencia: { tipo: 'veces_semana', veces: 5 },
        hora: '18:00',
        version_minima: '10 minutos de caminata o movilidad',
        objetivos: ['H2', 'H1'],
      },
      {
        titulo: 'Leer 20 minutos',
        frecuencia: { tipo: 'dias', dias: TODOS },
        hora: '21:00',
        duracion_min: 20,
        unidad: 'minutos',
        meta_por_vez: 20,
        version_minima: 'Leer 2 páginas',
        objetivos: ['D2'],
      },
      {
        titulo: 'Estudiar 45 minutos',
        frecuencia: { tipo: 'veces_semana', veces: 3 },
        duracion_min: 45,
        unidad: 'minutos',
        meta_por_vez: 45,
        version_minima: 'Ver un video del curso',
        objetivos: ['D1'],
      },
      {
        titulo: 'Pesarme por la mañana',
        frecuencia: { tipo: 'dias', dias: [1, 4] },
        hora: '07:30',
        objetivos: ['H1'],
      },
      {
        titulo: 'Revisión nocturna',
        frecuencia: { tipo: 'dias', dias: TODOS },
        hora: '21:30',
        duracion_min: 2,
        objetivos: [],
      },
    ],
  }
}

/** Ciclo vacío de 90 días con las tres dimensiones, para quien empieza de cero */
export function cicloVacio(desde = new Date()): PlantillaCiclo {
  return {
    nombre: 'Mi primer ciclo',
    ...rango(desde, 90),
    dimensiones: [
      { nombre: 'Salud y condición física', objetivos: [] },
      { nombre: 'Desarrollo personal', objetivos: [] },
      { nombre: 'Desarrollo profesional', objetivos: [] },
    ],
    habitos: [],
  }
}
