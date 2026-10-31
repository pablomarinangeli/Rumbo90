/** Catálogo de ideas genéricas de hábitos para sumar o dejar */
export interface Sugerencia {
  tipo: 'construir' | 'reducir'
  titulo: string
  area: string
  porque: string
  minima: string
  /** construir: días (0 = domingo); reducir: límite semanal */
  dias?: number[]
  /** construir: veces por semana (en lugar de días fijos) */
  veces?: number
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
export function linkSugerencia(s: Sugerencia, objetivoId?: string) {
  const p = new URLSearchParams({ tipo: s.tipo, titulo: s.titulo, minima: s.minima })
  if (s.dias) p.set('dias', s.dias.join(','))
  if (s.veces) p.set('veces', String(s.veces))
  if (s.limite != null) p.set('limite', String(s.limite))
  if (objetivoId) p.set('objetivo', objetivoId)
  return `/habitos/nuevo?${p.toString()}`
}

// ---------- sugerencias según las metas ----------

interface Tema {
  nombre: string
  /** Comienzos de palabra sin tildes y en minúscula; con $ al final, palabra exacta */
  claves: string[]
  habitos: Omit<Sugerencia, 'area'>[]
}

const LUN_MIE_VIE = [1, 3, 5]

const c = (titulo: string, porque: string, minima: string, frecuencia: { dias?: number[]; veces?: number } = { dias: TODOS }) =>
  ({ tipo: 'construir', titulo, porque, minima, ...frecuencia }) as const
const r = (titulo: string, porque: string, minima: string, limite: number) =>
  ({ tipo: 'reducir', titulo, porque, minima, limite }) as const

const TEMAS: Tema[] = [
  {
    nombre: 'Peso y alimentación',
    claves: ['peso$', 'kilo', 'kg', 'adelgaz', 'grasa', 'cintura', 'dieta', 'aliment', 'comer$', 'comida', 'nutric', 'imc$'],
    habitos: [
      c('Caminar 30 minutos', 'Suma gasto calórico sin castigar las articulaciones.', 'Caminar 10 minutos'),
      c('Comer verdura en 2 comidas', 'Más saciedad con menos calorías.', 'Verdura en una comida'),
      c('Pesarme y registrarlo', 'Lo que se mide, mejora. Una vez por semana alcanza.', 'Pesarme aunque no lo anote', { dias: [1] }),
      c('Tomar 2 litros de agua', 'Muchas veces la sed se confunde con hambre.', 'Un vaso grande al levantarte'),
      r('Pedir delivery', 'Es donde más se escapan las calorías.', 'Tener una comida congelada lista', 2),
      r('Picotear después de cenar', 'Son calorías que casi no se notan.', 'Un té después de cenar', 2),
      r('Gaseosas o bebidas azucaradas', 'Mucha azúcar líquida.', 'Agua con gas y limón', 1),
    ],
  },
  {
    nombre: 'Correr y resistencia',
    claves: ['correr', 'corrida', 'running', 'km', 'marat', '10k', '21k', '5k', 'trote', 'resistencia', 'carrera', 'bici', 'ciclis', 'natac', 'triatl'],
    habitos: [
      c('Salir a correr', 'La constancia semanal es lo que más rinde.', 'Trotar 10 minutos', { veces: 3 }),
      c('Estirar 10 minutos', 'Menos lesiones y mejor recuperación.', 'Estirar 2 minutos'),
      c('Ejercicio de fuerza', 'Piernas y core fuertes te hacen más rápido y menos lesionable.', '10 sentadillas y 10 estocadas', { veces: 2 }),
      c('Acostarme antes de las 23:30', 'El progreso se consolida durmiendo.', 'Apagar pantallas a las 23:30'),
    ],
  },
  {
    nombre: 'Fuerza y gimnasio',
    claves: ['fuerza', 'gimnas', 'gym', 'muscul', 'masa', 'pesas', 'entren', 'deport', 'fisic', 'ejercic'],
    habitos: [
      c('Entrenar fuerza', 'Tres sesiones por semana bastan para progresar.', '15 minutos con el peso del cuerpo', { dias: LUN_MIE_VIE }),
      c('Proteína en cada comida', 'Es la materia prima del músculo.', 'Proteína en el desayuno'),
      c('Caminar 8.000 pasos', 'Movimiento diario además del entrenamiento.', 'Caminar 10 minutos después de comer'),
      c('Acostarme antes de las 23:30', 'El músculo se construye descansando.', 'Apagar pantallas a las 23:30'),
    ],
  },
  {
    nombre: 'Salud y chequeos',
    claves: ['salud', 'presion', 'colesterol', 'gluc', 'diabet', 'medico', 'medicac', 'analisis', 'estudio medico', 'chequeo', 'corazon', 'cardio'],
    habitos: [
      c('Caminar 30 minutos', 'Mejora presión, glucosa y colesterol.', 'Caminar 10 minutos'),
      c('Tomar la medicación a horario', 'La regularidad es parte del tratamiento.', 'Dejar el pastillero a la vista'),
      c('Comer verdura en 2 comidas', 'Fibra y menos sodio.', 'Verdura en una comida'),
      r('Agregar sal a la comida', 'Menos sodio, mejor presión.', 'Usar limón o especias', 0),
      r('Alcohol en días de semana', 'Mejor sueño y menos calorías vacías.', 'Tener a mano una bebida sin alcohol', 0),
    ],
  },
  {
    nombre: 'Sueño y energía',
    claves: ['dorm', 'sueno', 'descans', 'energia', 'cansanc', 'insomn', 'madrug', 'levantar'],
    habitos: [
      c('Acostarme antes de las 23:30', 'Horario fijo = mejor sueño.', 'Apagar pantallas a las 23:30'),
      c('Levantarme a la misma hora', 'Ordena el reloj biológico.', 'Levantarme a horario aunque me vuelva a acostar un rato'),
      c('Luz natural a la mañana', '10 minutos de sol ajustan el ritmo del sueño.', 'Abrir la ventana al levantarme'),
      r('Celular en la cama', 'La pantalla retrasa el sueño.', 'Dejar el cargador fuera del cuarto', 0),
      r('Café después de las 16', 'La cafeína dura horas en el cuerpo.', 'Té sin cafeína a la tarde', 0),
      r('Posponer la alarma', 'Fragmenta el último tramo de sueño.', 'Dejar la alarma lejos de la cama', 1),
    ],
  },
  {
    nombre: 'Estrés y bienestar',
    claves: ['estres', 'ansied', 'medit', 'mindful', 'bienestar', 'calma', 'paz', 'felic', 'animo', 'mental', 'emocion'],
    habitos: [
      c('Meditar 10 minutos', 'Baja el estrés y mejora el foco.', '3 respiraciones profundas'),
      c('Anotar 3 cosas buenas del día', 'Entrena la mirada positiva.', 'Anotar 1 cosa buena'),
      c('Caminar sin celular', 'Despeja la cabeza.', '5 minutos afuera sin pantalla', { veces: 3 }),
      r('Redes sociales más de 30 minutos', 'Más comparación, más ansiedad.', 'Poner un límite de uso en el celular', 2),
    ],
  },
  {
    nombre: 'Lectura',
    claves: ['leer', 'lectura', 'libro', 'novela'],
    habitos: [
      c('Leer 20 minutos', 'Unos 15 libros por año sin darte cuenta.', 'Leer 2 páginas'),
      c('Llevar un libro encima', 'Convierte las esperas en lectura.', 'Tener el libro en el celular'),
      r('Redes sociales más de 30 minutos', 'Es el tiempo que le falta a la lectura.', 'Abrir el libro en vez de las redes', 2),
    ],
  },
  {
    nombre: 'Idiomas y estudio',
    claves: ['ingles', 'idioma', 'portugu', 'italian', 'aleman', 'frances', 'certific', 'curso', 'estudi', 'aprend', 'carrera', 'examen', 'posgrado', 'maestr', 'capacit'],
    habitos: [
      c('Estudiar 30 minutos', 'Poco y seguido rinde más que mucho de golpe.', 'Estudiar 10 minutos', { dias: [1, 2, 3, 4, 5] }),
      c('Repasar con tarjetas 10 minutos', 'El repaso espaciado fija lo aprendido.', 'Repasar 5 tarjetas'),
      c('Bloque de estudio de 90 minutos', 'Para avanzar en serio una vez por semana.', '30 minutos de estudio', { dias: [6] }),
    ],
  },
  {
    nombre: 'Escritura y creación',
    claves: ['escrib', 'blog', 'articul', 'contenido', 'podcast', 'video', 'publicar', 'newsletter'],
    habitos: [
      c('Escribir 300 palabras', 'Un borrador por semana sale solo.', 'Escribir una frase'),
      c('Publicar una pieza', 'Terminar y mostrar es parte del hábito.', 'Compartir un borrador', { dias: [5] }),
    ],
  },
  {
    nombre: 'Finanzas',
    claves: ['ahorr', 'dinero', 'plata', 'deuda', 'finanz', 'gasto', 'invers', 'presupuest', 'sueldo', 'ingreso', 'usd$', 'dolar', 'pesos$'],
    habitos: [
      c('Anotar los gastos del día', 'Saber en qué se va es el primer paso para ahorrar.', 'Anotar el gasto más grande'),
      c('Revisar el presupuesto semanal', '15 minutos por semana para no desviarte.', 'Mirar el saldo de la cuenta', { dias: [0] }),
      r('Compras por impulso online', 'El ahorro más fácil es el que no se gasta.', 'Dejarlo 48 horas en el carrito', 1),
      r('Pedir delivery', 'Uno de los gastos hormiga más grandes.', 'Tener una comida congelada lista', 2),
    ],
  },
  {
    nombre: 'Trabajo y proyectos',
    claves: ['trabaj', 'proyect', 'lanz', 'entreg', 'cliente', 'empresa', 'negocio', 'sistema', 'desarroll', 'app$', 'producto', 'equipo', 'gestion', 'ascen', 'profes', 'oficina', 'migr', 'implement'],
    habitos: [
      c('Planificar el día en 5 minutos', 'Elegir las 3 prioridades evita apagar incendios todo el día.', 'Escribir la prioridad número 1', { dias: [1, 2, 3, 4, 5] }),
      c('Bloque de trabajo profundo de 90 minutos', 'Lo importante avanza sin interrupciones.', '25 minutos sin notificaciones', { dias: [1, 2, 3, 4, 5] }),
      c('Revisión semanal de avances', 'Cerrar la semana y planear la próxima.', 'Anotar lo que quedó pendiente', { dias: [5] }),
      r('Revisar el mail fuera de horario', 'Descansar de verdad para rendir mejor.', 'Silenciar el mail después de las 20', 1),
    ],
  },
  {
    nombre: 'Ventas y contactos',
    claves: ['venta', 'vender', 'facturac', 'prospect', 'contact', 'red de contactos', 'networking', 'linkedin', 'comercial'],
    habitos: [
      c('Contactar a 3 clientes o prospectos', 'Las ventas son un juego de volumen y constancia.', 'Un mensaje a un cliente', { dias: [1, 2, 3, 4, 5] }),
      c('Hacer seguimiento de propuestas', 'La mayoría de las ventas se cierran en el seguimiento.', 'Revisar la lista de pendientes', { dias: [2, 4] }),
    ],
  },
  {
    nombre: 'Familia y vínculos',
    claves: ['famil', 'hij', 'pareja', 'espos', 'amig', 'vincul', 'relacion', 'padres', 'tiempo de calidad'],
    habitos: [
      c('Cena sin celulares', 'Tiempo de calidad todos los días.', 'Celular lejos de la mesa'),
      c('Llamar a un amigo o familiar', 'Los vínculos se riegan.', 'Mandar un mensaje', { veces: 1 }),
      c('Salida o plan en familia', 'Un momento compartido por semana.', 'Un rato de juego en casa', { dias: [6] }),
      r('Celular en momentos compartidos', 'Estar presente de verdad.', 'Dejarlo en otra habitación', 2),
    ],
  },
  {
    nombre: 'Dejar de fumar',
    claves: ['fum', 'cigarr', 'tabaco', 'vape', 'nicotin'],
    habitos: [
      r('Fumar', 'Cada cigarrillo menos ya es salud.', 'Respirar hondo 1 minuto o tomar agua', 3),
      c('Caminar 10 minutos cuando aparece la ganas', 'Reemplaza el ritual por movimiento.', 'Salir un minuto afuera'),
    ],
  },
  {
    nombre: 'Alcohol',
    claves: ['alcohol', 'cerveza', 'vino', 'beber', 'tomar menos'],
    habitos: [
      r('Alcohol', 'Mejor sueño, energía y peso.', 'Tener a mano una bebida sin alcohol', 2),
      c('Tomar 2 litros de agua', 'Ayuda a no llegar con sed a la noche.', 'Un vaso grande al levantarte'),
    ],
  },
  {
    nombre: 'Pantallas',
    claves: ['celular', 'pantalla', 'redes', 'instagram', 'tiktok', 'youtube', 'scroll', 'netflix'],
    habitos: [
      r('Redes sociales más de 30 minutos', 'Recuperás tiempo para lo que importa.', 'Poner un límite de uso en el celular', 2),
      r('Celular en la cama', 'Te dormís antes y mejor.', 'Dejar el cargador fuera del cuarto', 0),
      c('Una hora sin pantallas antes de dormir', 'Mejor descanso y más tiempo para leer.', '15 minutos sin pantallas'),
    ],
  },
]

/** Quita tildes y pasa a minúscula para comparar textos */
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function coincide(texto: string, clave: string) {
  const exacta = clave.endsWith('$')
  const raiz = clave.replace(/\$$/, '').replace(/[.*+?^{}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${raiz}${exacta ? '($|[^a-z0-9])' : ''}`).test(texto)
}

export interface MetaParaSugerir {
  titulo: string
  descripcion: string | null
  unidad: string | null
  tipo: string
  dimension?: string | null
}

/**
 * Sugiere hábitos para una meta según las palabras de su título, descripción, unidad y dimensión.
 * Excluye los que ya existen (por título). Siempre devuelve algo: si no reconoce el tema, propone hábitos genéricos.
 */
export function sugerirParaMeta(meta: MetaParaSugerir, existentes: string[], max = 6) {
  const texto = normalizar(` ${meta.titulo} ${meta.descripcion ?? ''} ${meta.unidad ?? ''} `)
  const yaEstan = new Set(existentes.map(normalizar))
  const enTitulo = normalizar(meta.titulo)
  const puntaje = (t: Tema) => t.claves.reduce((n, clave) => n + (coincide(texto, clave) ? (coincide(enTitulo, clave) ? 2 : 1) : 0), 0)
  let temas = TEMAS.map((t) => ({ t, p: puntaje(t) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, 2)
    .map((x) => x.t)

  // Sin coincidencias: usar la dimensión como pista
  if (!temas.length && meta.dimension) {
    const dim = normalizar(meta.dimension)
    const porDimension = dim.includes('salud')
      ? ['Peso y alimentación', 'Sueño y energía']
      : dim.includes('profes') || dim.includes('trabajo')
        ? ['Trabajo y proyectos']
        : dim.includes('personal') || dim.includes('desarrollo')
          ? ['Lectura', 'Estrés y bienestar']
          : dim.includes('relacion') || dim.includes('vinculo')
            ? ['Familia y vínculos']
            : dim.includes('finanz') || dim.includes('patrimonio')
              ? ['Finanzas']
              : dim.includes('experiencia') || dim.includes('disfrute')
                ? ['Estrés y bienestar', 'Escritura y creación']
                : []
    temas = TEMAS.filter((t) => porDimension.includes(t.nombre))
  }

  const titulo = meta.titulo.trim()
  const propios: Omit<Sugerencia, 'area'>[] =
    meta.tipo === 'proyecto'
      ? [
          c(`Avanzar 30 minutos en «${titulo}»`, 'Un proyecto avanza con bloques chicos y frecuentes.', '10 minutos o la próxima acción concreta', { dias: [1, 2, 3, 4, 5] }),
          c(`Revisar hitos de «${titulo}»`, 'Ver qué sigue y qué está trabado.', 'Mirar la lista de hitos', { dias: [5] }),
        ]
      : [c(`Registrar el avance de «${titulo}»`, 'Medir una vez por semana mantiene la meta a la vista.', 'Anotar el número aunque no sea bueno', { dias: [0] })]

  const vistos = new Set<string>()
  const resultado: (Sugerencia & { tema: string })[] = []
  for (const [tema, lista] of [...temas.map((t) => [t.nombre, t.habitos] as const), ['Para esta meta', propios] as const]) {
    for (const h of lista) {
      const clave = normalizar(h.titulo)
      if (yaEstan.has(clave) || vistos.has(clave)) continue
      vistos.add(clave)
      resultado.push({ ...h, area: tema, tema })
    }
  }
  // Intercalar: primero lo del tema principal, después lo propio de la meta, sin pasar el máximo
  const principales = resultado.filter((x) => x.tema !== 'Para esta meta').slice(0, max - Math.min(1, propios.length))
  const deLaMeta = resultado.filter((x) => x.tema === 'Para esta meta')
  return [...principales, ...deLaMeta].slice(0, max)
}

/** Temas reconocidos, para mostrar "Detecté: ..." */
export function temasDeMeta(meta: MetaParaSugerir) {
  const texto = normalizar(` ${meta.titulo} ${meta.descripcion ?? ''} ${meta.unidad ?? ''} `)
  return TEMAS.filter((t) => t.claves.some((k) => coincide(texto, k))).map((t) => t.nombre)
}
