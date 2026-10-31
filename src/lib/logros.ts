import { useCallback, useEffect, useState } from 'react'
import { fechaISO, inicioSemana, type Ciclo, type EstadoCompromiso, type Habito, type RegistroHabito } from './datos'
import { supabase } from './supabase'

/*
 * Gamificación calculada a partir del historial: no guarda nada extra en la base.
 * Reglas de la casa: se premia la constancia, no la perfección. Las rachas toleran
 * un tropiezo aislado ("nunca dos veces seguidas") y nunca se vuelve al día 1 por un mal día.
 */

export interface HistCompromiso {
  fecha: string
  habito_id: string | null
  estado: EstadoCompromiso
}

export interface Historial {
  habitos: Habito[]
  compromisos: HistCompromiso[]
  registros: RegistroHabito[]
}

export const XP = { realizado: 10, parcial: 5, diaPerfecto: 15, semanaEnLimite: 20, semanaLimpia: 30 }
const PESO: Partial<Record<EstadoCompromiso, number>> = { realizado: 1, parcial: 0.5 }
const UMBRAL_DIA = 0.5
const UMBRAL_SEMANA = 0.85

export function useHistorial(ciclo: Ciclo) {
  const [historial, setHistorial] = useState<Historial | null>(null)

  const recargar = useCallback(async () => {
    const [h, c, r] = await Promise.all([
      supabase
        .from('habitos')
        .select('id, titulo, frecuencia, hora, duracion_min, version_minima, activo, tipo, limite_semana, created_at')
        .eq('ciclo_id', ciclo.id),
      supabase
        .from('compromisos')
        .select('fecha, habito_id, estado')
        .gte('fecha', ciclo.fecha_inicio)
        .order('fecha', { ascending: false }),
      supabase.from('registros_habito').select('id, habito_id, fecha').gte('fecha', ciclo.fecha_inicio),
    ])
    setHistorial({
      habitos: (h.data ?? []) as Habito[],
      compromisos: (c.data ?? []) as HistCompromiso[],
      registros: (r.data ?? []) as RegistroHabito[],
    })
  }, [ciclo.id, ciclo.fecha_inicio])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { historial, recargar }
}

// ---------- utilidades de fechas ----------

const desplazar = (fecha: string, dias: number) => fechaISO(new Date(Date.parse(fecha + 'T00:00:00') + dias * 864e5))
const diaSemana = (fecha: string) => new Date(fecha + 'T00:00:00').getDay()
const creadoEl = (h: Habito) => fechaISO(new Date(h.created_at))

function rango(desde: string, hasta: string) {
  const dias: string[] = []
  for (let f = desde; f <= hasta; f = desplazar(f, 1)) dias.push(f)
  return dias
}

// ---------- cálculos base ----------

function indice(hist: Historial) {
  const estados = new Map<string, EstadoCompromiso>()
  for (const c of hist.compromisos) if (c.habito_id) estados.set(`${c.habito_id}|${c.fecha}`, c.estado)
  return estados
}

const construir = (hist: Historial) => hist.habitos.filter((h) => h.tipo !== 'reducir')
const reducir = (hist: Historial) => hist.habitos.filter((h) => h.tipo === 'reducir')

function programadoEl(h: Habito, fecha: string) {
  return h.activo && h.frecuencia.tipo === 'dias' && h.frecuencia.dias.includes(diaSemana(fecha)) && creadoEl(h) <= fecha
}

/** Cumplimiento de un día (0 a 1), o null si ese día no había nada programado */
function cumplimientoDia(hist: Historial, estados: Map<string, EstadoCompromiso>, fecha: string) {
  const programados = construir(hist).filter((h) => programadoEl(h, fecha))
  if (!programados.length) return null
  const suma = programados.reduce((s, h) => s + (PESO[estados.get(`${h.id}|${fecha}`) ?? 'pendiente'] ?? 0), 0)
  return suma / programados.length
}

/** Racha tolerante: un fallo aislado no la corta, dos seguidos sí. Hoy pendiente no cuenta en contra. */
function racha(dias: { fecha: string; ok: boolean | null }[], hoy: string) {
  let actual = 0
  let maxima = 0
  let fallos = 0
  for (const d of dias) {
    if (d.ok == null || (d.fecha === hoy && !d.ok)) continue
    if (d.ok) {
      actual++
      fallos = 0
    } else if (++fallos >= 2) actual = 0
    maxima = Math.max(maxima, actual)
  }
  return { actual, maxima, enRiesgo: fallos === 1 && actual > 0 }
}

function primerDia(hist: Historial) {
  const fechas = hist.habitos.map(creadoEl).sort()
  return fechas[0]
}

/** Semanas (lunes) ya terminadas desde que existe el primer hábito */
function semanasCerradas(hist: Historial, hoy: string) {
  const inicio = primerDia(hist)
  if (!inicio) return []
  const semanas: string[] = []
  for (let l = inicioSemana(new Date(inicio + 'T00:00:00')); desplazar(l, 6) < hoy; l = desplazar(l, 7)) semanas.push(l)
  return semanas
}

const contarRegistros = (hist: Historial, habitoId: string, desde: string, hasta: string) =>
  hist.registros.filter((r) => r.habito_id === habitoId && r.fecha >= desde && r.fecha <= hasta).length

// ---------- resumen de gamificación ----------

export interface Insignia {
  id: string
  emoji: string
  nombre: string
  descripcion: string
  lograda: boolean
}

export interface Mensaje {
  tipo: 'festejo' | 'aviso' | 'reto'
  texto: string
}

export const NIVELES = [
  { desde: 0, nombre: 'Arranque' },
  { desde: 100, nombre: 'En marcha' },
  { desde: 300, nombre: 'Constante' },
  { desde: 600, nombre: 'Enfocado' },
  { desde: 1000, nombre: 'Disciplinado' },
  { desde: 1600, nombre: 'Imparable' },
  { desde: 2400, nombre: 'Referente' },
  { desde: 3500, nombre: 'Leyenda' },
]

const RETOS_DEL_DIA = [
  'Hacé primero el hábito que más te cuesta, antes del mediodía.',
  'Dejá preparado esta noche lo que necesitás para mañana.',
  'Sumá 10 minutos extra a tu hábito favorito.',
  'Contale a alguien qué hábito estás construyendo.',
  'Hoy apuntá al día perfecto: todos los compromisos en Hecho.',
  'Hacé tu versión mínima apenas te levantes y sumá desde ahí.',
  'Elegí un momento del día sin celular y usalo para un hábito.',
]

export function calcularLogros(hist: Historial, hoy = fechaISO()) {
  const estados = indice(hist)
  const inicio = primerDia(hist)
  const dias = inicio ? rango(inicio, hoy) : []
  const porDia = dias.map((fecha) => ({ fecha, c: cumplimientoDia(hist, estados, fecha) }))

  // Puntos
  let xp = 0
  for (const c of hist.compromisos) xp += c.estado === 'realizado' ? XP.realizado : c.estado === 'parcial' ? XP.parcial : 0
  const diasPerfectos = porDia.filter((d) => d.c === 1).length
  xp += diasPerfectos * XP.diaPerfecto

  const semanas = semanasCerradas(hist, hoy)
  let semanasEnLimite = 0
  let semanasLimpias = 0
  let alguienBajando = false
  for (const h of reducir(hist)) {
    const propias = semanas.filter((l) => l >= inicioSemana(new Date(creadoEl(h) + 'T00:00:00')))
    const conteos = propias.map((l) => contarRegistros(hist, h.id, l, desplazar(l, 6)))
    conteos.forEach((n, i) => {
      if (n <= (h.limite_semana ?? 0)) {
        semanasEnLimite++
        xp += XP.semanaEnLimite
      }
      if (n === 0) {
        semanasLimpias++
        xp += XP.semanaLimpia - XP.semanaEnLimite
      }
      if (i > 0 && n < conteos[i - 1]) alguienBajando = true
    })
  }

  const nivelIdx = NIVELES.reduce((idx, n, i) => (xp >= n.desde ? i : idx), 0)
  const nivel = NIVELES[nivelIdx]
  const siguiente = NIVELES[nivelIdx + 1]

  // Rachas
  const general = racha(
    porDia.map((d) => ({ fecha: d.fecha, ok: d.c == null ? null : d.c >= UMBRAL_DIA })),
    hoy,
  )
  const rachasHabito = new Map<string, ReturnType<typeof racha>>()
  for (const h of construir(hist)) {
    if (h.frecuencia.tipo !== 'dias') continue
    rachasHabito.set(
      h.id,
      racha(
        dias
          .filter((f) => programadoEl(h, f))
          .map((fecha) => {
            const e = estados.get(`${h.id}|${fecha}`)
            return { fecha, ok: e === 'realizado' || e === 'parcial' }
          }),
        hoy,
      ),
    )
  }

  // Semanas al 85%
  const promedioSemana = (lunes: string, hasta: string) => {
    const vals = porDia.filter((d) => d.fecha >= lunes && d.fecha <= hasta && d.c != null).map((d) => d.c!)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const semanasExito = semanas.filter((l) => (promedioSemana(l, desplazar(l, 6)) ?? 0) >= UMBRAL_SEMANA).length
  const realizados = hist.compromisos.filter((c) => c.estado === 'realizado').length
  const resiliente = porDia.some((d, i) => i > 0 && d.c != null && d.c >= UMBRAL_DIA && (porDia[i - 1].c ?? 1) < UMBRAL_DIA)

  const insignias: Insignia[] = [
    { id: 'primer-paso', emoji: '👟', nombre: 'Primer paso', descripcion: 'Completaste tu primer compromiso', lograda: realizados >= 1 },
    { id: 'dia-perfecto', emoji: '⭐', nombre: 'Día perfecto', descripcion: 'Todos los compromisos del día en Hecho', lograda: diasPerfectos >= 1 },
    { id: 'racha-3', emoji: '🔥', nombre: 'Racha de 3', descripcion: '3 días cumpliendo al menos la mitad', lograda: general.maxima >= 3 },
    { id: 'racha-7', emoji: '🔥', nombre: 'Racha de 7', descripcion: 'Una semana entera de constancia', lograda: general.maxima >= 7 },
    { id: 'racha-21', emoji: '🏔️', nombre: 'Racha de 21', descripcion: '21 días: el hábito empieza a ser tuyo', lograda: general.maxima >= 21 },
    { id: 'racha-60', emoji: '🚀', nombre: 'Racha de 60', descripcion: 'Dos meses sin aflojar', lograda: general.maxima >= 60 },
    { id: 'resiliente', emoji: '💪', nombre: 'Resiliente', descripcion: 'Volviste fuerte después de un mal día', lograda: resiliente },
    { id: 'semana-85', emoji: '🎯', nombre: 'Semana ganada', descripcion: 'Cerraste una semana con 85% o más', lograda: semanasExito >= 1 },
    { id: 'cuatro-semanas', emoji: '🏆', nombre: 'Mes ganador', descripcion: '4 semanas cerradas con 85% o más', lograda: semanasExito >= 4 },
    { id: 'cincuenta', emoji: '🥈', nombre: '50 compromisos', descripcion: '50 compromisos completados', lograda: realizados >= 50 },
    { id: 'cien', emoji: '🥇', nombre: '100 compromisos', descripcion: '100 compromisos completados', lograda: realizados >= 100 },
    { id: 'bajo-control', emoji: '🛡️', nombre: 'Bajo control', descripcion: 'Una semana dentro del límite en un hábito a reducir', lograda: semanasEnLimite >= 1 },
    { id: 'semana-limpia', emoji: '🧼', nombre: 'Semana limpia', descripcion: 'Una semana entera en cero en un hábito a reducir', lograda: semanasLimpias >= 1 },
    { id: 'en-baja', emoji: '📉', nombre: 'En baja', descripcion: 'Una semana con menos caídas que la anterior', lograda: alguienBajando },
  ]

  const mensajes = mensajesDelCoach(hist, estados, { hoy, porDia, general, promedioSemana, insignias })

  return { xp, nivel, siguiente, racha: general, rachasHabito, insignias, mensajes, semanasExito, diasPerfectos }
}

// ---------- coach: siempre positivo ----------

function mensajesDelCoach(
  hist: Historial,
  estados: Map<string, EstadoCompromiso>,
  ctx: {
    hoy: string
    porDia: { fecha: string; c: number | null }[]
    general: ReturnType<typeof racha>
    promedioSemana: (lunes: string, hasta: string) => number | null
    insignias: Insignia[]
  },
): Mensaje[] {
  const { hoy, porDia, general } = ctx
  const mensajes: Mensaje[] = []
  const hoyC = porDia.find((d) => d.fecha === hoy)?.c

  if (hoyC === 1) mensajes.push({ tipo: 'festejo', texto: `¡Día perfecto! Sumaste ${XP.diaPerfecto} puntos extra. Así se hace.` })

  if (general.enRiesgo && hoyC !== 1 && (hoyC ?? 0) < UMBRAL_DIA) {
    mensajes.push({
      tipo: 'aviso',
      texto: `Ayer no salió, pero tu racha de ${general.actual} ${general.actual === 1 ? 'día' : 'días'} sigue viva. Hoy con la versión mínima la sostenés.`,
    })
  }

  // Hábitos malos al límite o pasados esta semana
  const lunes = inicioSemana()
  for (const h of reducir(hist).filter((x) => x.activo)) {
    const n = contarRegistros(hist, h.id, lunes, hoy)
    const limite = h.limite_semana ?? 0
    if (n > limite) {
      mensajes.push({
        tipo: 'aviso',
        texto: `Esta semana te pasaste en «${h.titulo}». No pasa nada: el lunes arrancás de cero.${h.version_minima ? ` Plan B: ${h.version_minima}.` : ''}`,
      })
    } else if (limite > 0 && n === limite) {
      mensajes.push({ tipo: 'reto', texto: `Llegaste al límite de «${h.titulo}». Reto: llegar al domingo sin sumar otro.` })
    }
  }

  // Comparación con la semana pasada
  const ayer = desplazar(hoy, -1)
  if (ayer >= lunes) {
    const esta = ctx.promedioSemana(lunes, ayer)
    const pasada = ctx.promedioSemana(desplazar(lunes, -7), desplazar(lunes, -1))
    if (esta != null && pasada != null && pasada - esta >= 0.15) {
      mensajes.push({
        tipo: 'aviso',
        texto: `Esta semana vas en ${Math.round(esta * 100)}% y la pasada cerraste en ${Math.round(pasada * 100)}%. Todavía estás a tiempo de darla vuelta: empezá por el más fácil.`,
      })
    } else if (esta != null && esta >= UMBRAL_SEMANA) {
      mensajes.push({ tipo: 'festejo', texto: `Vas en ${Math.round(esta * 100)}% esta semana. Estás en zona de semana ganada.` })
    }
  }

  // Hábitos que vienen costando
  const hace14 = desplazar(hoy, -14)
  for (const h of construir(hist).filter((x) => x.activo && x.frecuencia.tipo === 'dias')) {
    const fechas = rango(hace14 > creadoEl(h) ? hace14 : creadoEl(h), ayer).filter((f) => programadoEl(h, f))
    if (fechas.length < 4) continue
    const hechos = fechas.reduce((s, f) => s + (PESO[estados.get(`${h.id}|${f}`) ?? 'pendiente'] ?? 0), 0)
    const tasa = hechos / fechas.length
    if (tasa < 0.4) {
      mensajes.push({
        tipo: 'reto',
        texto: `«${h.titulo}» viene costando (${Math.round(tasa * 100)}% en dos semanas). ¿Lo achicamos? ${h.version_minima ? `Probá unos días solo con «${h.version_minima}»` : 'Probá con menos días o una versión mínima'}.`,
      })
    }
  }

  // Próxima insignia de racha
  const proxima = [3, 7, 21, 60].find((n) => n > general.actual)
  if (proxima && proxima - general.actual === 1 && (hoyC ?? 0) < UMBRAL_DIA) {
    mensajes.push({ tipo: 'reto', texto: `Si hoy cumplís la mitad, desbloqueás la insignia «Racha de ${proxima}».` })
  }

  if (mensajes.length === 0 || mensajes.every((m) => m.tipo === 'festejo')) {
    const n = Math.floor(Date.parse(hoy + 'T00:00:00') / 864e5)
    mensajes.push({ tipo: 'reto', texto: `Reto del día: ${RETOS_DEL_DIA[n % RETOS_DEL_DIA.length]}` })
  }

  return mensajes.slice(0, 3)
}
