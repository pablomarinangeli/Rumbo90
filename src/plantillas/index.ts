import type { PlantillaCiclo } from './tipos'

const TODOS = [0, 1, 2, 3, 4, 5, 6]

/** Primer ciclo de Rumbo 90, tal como está en docs/especificacion.md */
export const cicloRumbo90: PlantillaCiclo = {
  nombre: 'Ciclo 1 · Rumbo 90',
  fecha_inicio: '2026-10-30',
  fecha_fin: '2026-12-31',
  dimensiones: [
    {
      nombre: 'Salud y condición física',
      objetivos: [
        {
          codigo: 'H1',
          titulo: 'Mejorar mi composición corporal y mis hábitos alimentarios',
          tipo: 'meta_numerica',
          unidad: 'kg',
          valor_inicial: 104,
          valor_meta: 99,
        },
        {
          codigo: 'H2',
          titulo: 'Mejorar mi condición física y sostener el entrenamiento',
          descripcion: 'VO₂ máx. 38 → 42 · edad física 56,5 → 53 · actividad semanal 1 → 5',
          tipo: 'promedio',
          unidad: 'VO₂ máx.',
          valor_inicial: 38,
          valor_meta: 42,
        },
      ],
    },
    {
      nombre: 'Desarrollo personal',
      objetivos: [
        {
          codigo: 'D1',
          titulo: 'Desarrollar competencias prácticas en inteligencia artificial',
          descripcion: '3 cursos completos de Claude, con una aplicación concreta de cada uno',
          tipo: 'conteo',
          unidad: 'cursos',
          valor_inicial: 0,
          valor_meta: 3,
        },
        {
          codigo: 'D2',
          titulo: 'Reemplazar consumo pasivo de redes por lectura',
          descripcion: '3 libros terminados, con al menos tres ideas aplicadas',
          tipo: 'conteo',
          unidad: 'libros',
          valor_inicial: 0,
          valor_meta: 3,
        },
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
          valor_meta: 6,
        },
        { codigo: 'P1a', titulo: 'Acuerdo con Grido por 36 meses', tipo: 'proyecto' },
        { codigo: 'P1b', titulo: 'Distribución del POS offline', tipo: 'proyecto' },
        { codigo: 'P1c', titulo: 'Plan 2027 y roadmap de productos', tipo: 'proyecto' },
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
      objetivos: ['P1'],
    },
    {
      titulo: 'Registrar alimentación y harinas',
      frecuencia: { tipo: 'dias', dias: TODOS },
      hora: '14:00',
      version_minima: 'Anotar solo las harinas del día',
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
      titulo: 'Estudiar IA 45 minutos',
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

/** Ciclo vacío de 90 días con las tres dimensiones, para quien empieza de cero */
export function cicloVacio(desde = new Date()): PlantillaCiclo {
  const inicio = desde.toISOString().slice(0, 10)
  const fin = new Date(desde.getTime() + 89 * 864e5).toISOString().slice(0, 10)
  return {
    nombre: 'Mi primer ciclo',
    fecha_inicio: inicio,
    fecha_fin: fin,
    dimensiones: [
      { nombre: 'Salud y condición física', objetivos: [] },
      { nombre: 'Desarrollo personal', objetivos: [] },
      { nombre: 'Desarrollo profesional', objetivos: [] },
    ],
    habitos: [],
  }
}
