/** Catálogo de ideas genéricas de hábitos para sumar o dejar */
export interface Sugerencia {
  tipo: 'construir' | 'reducir'
  titulo: string
  area: string
  porque: string
  minima: string
  /** construir: días (0 = domingo); reducir: límite semanal */
  dias?: number[]
  limite?: number
}

const TODOS = [0, 1, 2, 3, 4, 5, 6]
const HABILES = [1, 2, 3, 4, 5]

export const SUGERENCIAS: Sugerencia[] = [
  { tipo: 'construir', area: 'Salud', titulo: 'Caminar 30 minutos', porque: 'Mejora energía, ánimo y sueño.', minima: 'Caminar 10 minutos', dias: TODOS },
  { tipo: 'construir', area: 'Salud', titulo: 'Tomar 2 litros de agua', porque: 'Menos cansancio y menos picoteo.', minima: 'Un vaso grande al levantarte', dias: TODOS },
  { tipo: 'construir', area: 'Salud', titulo: 'Acostarme antes de las 23:30', porque: 'Dormir bien sostiene todos los demás hábitos.', minima: 'Apagar pantallas a las 23:30', dias: TODOS },
  { tipo: 'construir', area: 'Salud', titulo: 'Ejercicio de fuerza', porque: 'Protege músculos y articulaciones.', minima: '10 sentadillas y 10 flexiones', dias: [1, 3, 5] },
  { tipo: 'construir', area: 'Salud', titulo: 'Estirar 10 minutos', porque: 'Menos dolores de espalda si trabajás sentado.', minima: 'Estirar 2 minutos', dias: TODOS },
  { tipo: 'construir', area: 'Desarrollo personal', titulo: 'Leer 20 minutos', porque: 'Unos 15 libros por año sin darte cuenta.', minima: 'Leer 2 páginas', dias: TODOS },
  { tipo: 'construir', area: 'Desarrollo personal', titulo: 'Meditar 10 minutos', porque: 'Baja el estrés y mejora el foco.', minima: '3 respiraciones profundas', dias: TODOS },
  { tipo: 'construir', area: 'Desarrollo personal', titulo: 'Anotar 3 cosas buenas del día', porque: 'Entrena la mirada positiva.', minima: 'Anotar 1 cosa buena', dias: TODOS },
  { tipo: 'construir', area: 'Desarrollo personal', titulo: 'Practicar inglés 15 minutos', porque: 'Poco y todos los días rinde más que mucho de vez en cuando.', minima: '5 minutos en una app', dias: HABILES },
  { tipo: 'construir', area: 'Profesional', titulo: 'Planificar el día en 5 minutos', porque: 'Elegir las 3 prioridades evita apagar incendios todo el día.', minima: 'Escribir la prioridad número 1', dias: HABILES },
  { tipo: 'construir', area: 'Profesional', titulo: 'Bloque de trabajo profundo de 90 minutos', porque: 'Avanza lo importante sin interrupciones.', minima: '25 minutos sin notificaciones', dias: HABILES },
  { tipo: 'construir', area: 'Profesional', titulo: 'Cerrar la bandeja de entrada', porque: 'Terminar el día sin pendientes ocultos.', minima: 'Archivar lo que ya está resuelto', dias: HABILES },
  { tipo: 'reducir', area: 'Salud', titulo: 'Pedir delivery', porque: 'Ahorro y comida más sana.', minima: 'Tener una comida congelada lista', limite: 2 },
  { tipo: 'reducir', area: 'Salud', titulo: 'Gaseosas o bebidas azucaradas', porque: 'Mucha azúcar que no se nota.', minima: 'Agua con gas y limón', limite: 2 },
  { tipo: 'reducir', area: 'Salud', titulo: 'Picotear después de cenar', porque: 'Mejor descanso y control de peso.', minima: 'Un té después de cenar', limite: 2 },
  { tipo: 'reducir', area: 'Salud', titulo: 'Alcohol en días de semana', porque: 'Mejor sueño y más energía al día siguiente.', minima: 'Tener a mano una bebida sin alcohol', limite: 0 },
  { tipo: 'reducir', area: 'Desarrollo personal', titulo: 'Celular en la cama', porque: 'Te dormís antes y mejor.', minima: 'Dejar el cargador fuera del cuarto', limite: 0 },
  { tipo: 'reducir', area: 'Desarrollo personal', titulo: 'Redes sociales más de 30 minutos', porque: 'Recuperás tiempo para lo que importa.', minima: 'Poner un límite de uso en el celular', limite: 2 },
  { tipo: 'reducir', area: 'Desarrollo personal', titulo: 'Posponer la alarma', porque: 'Arrancar el día ganando la primera batalla.', minima: 'Dejar la alarma lejos de la cama', limite: 1 },
  { tipo: 'reducir', area: 'Profesional', titulo: 'Revisar el mail fuera de horario', porque: 'Descansar de verdad para rendir mejor.', minima: 'Silenciar el mail después de las 20', limite: 1 },
  { tipo: 'reducir', area: 'Profesional', titulo: 'Compras por impulso online', porque: 'Ahorro y menos cosas que no usás.', minima: 'Dejarlo 48 horas en el carrito', limite: 1 },
]

/** Arma el link al formulario con la sugerencia precargada */
export function linkSugerencia(s: Sugerencia) {
  const p = new URLSearchParams({ tipo: s.tipo, titulo: s.titulo, minima: s.minima })
  if (s.dias) p.set('dias', s.dias.join(','))
  if (s.limite != null) p.set('limite', String(s.limite))
  return `/habitos/nuevo?${p.toString()}`
}
