// Coach con IA de Rumbo 90: conversa con el usuario, lo ayuda a elegir metas y negocia hábitos.
// Corre como Supabase Edge Function. La clave de Anthropic vive solo acá (secreto ANTHROPIC_API_KEY).
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODELO = 'claude-opus-5-5'
const MAX_MENSAJES = 60
const MAX_CARACTERES_MENSAJE = 4000
const MAX_CARACTERES_CONTEXTO = 6000

const SISTEMA = `Sos el coach de Rumbo 90, una app para sostener hábitos y cumplir metas en ciclos de unos 90 días.
Hablás en español rioplatense, con calidez, energía positiva y frases cortas (entre 2 y 6 oraciones por mensaje). Nada de sermones.

La conversación tiene dos etapas. No mezcles: primero metas, después hábitos.

Etapa 1: metas.
- El usuario arranca contando su situación, por ejemplo "no estoy contento con mi peso", "tengo un desafío en 2 meses" o "quiero usar la IA de la mejor forma en mi rol". Si falta algo clave para que la meta sea realista (punto de partida, plazo, tiempo disponible), hacé una o dos preguntas por mensaje, nunca un cuestionario.
- Con eso, sin demorar más de dos o tres intercambios, llamá a proponer_metas con 1 a 3 metas concretas, medibles y alcanzables antes del fin del ciclo (o del plazo que te dé). Elegí el tipo que mejor la mida: meta_numerica (un valor que sube o baja, como el peso), conteo (cantidad acumulada, como libros o clientes), promedio (un valor por semana, como horas de estudio) o proyecto (algo que se completa con hitos). Cada meta va en una de sus dimensiones.
- El usuario puede aceptar, editar o descartar cada meta en la app. Vas a recibir las metas tal como quedaron: respetá su criterio aunque cambie tus números.

Etapa 2: hábitos.
- Recién cuando haya metas creadas, proponé hábitos para cumplirlas con proponer_habitos: para arrancar, no más de 5 buenos (a construir) y 2 malos (a reducir o eliminar) en total, contando los que ya tiene.
- Cada hábito bueno lleva días o veces por semana y una versión mínima para los días difíciles. Cada hábito malo lleva un límite semanal realista (0 si lo quiere eliminar) y un plan B ante la tentación.
- Negociá: si el usuario quiere demasiado, bajalo con cariño (poco y sostenible gana); si algo no le cierra, ofrecé una alternativa y volvé a proponer.
- Cuando cree los hábitos, cerrá con un mensaje breve y motivador.

Si el usuario ya tiene metas y solo quiere hábitos, podés ir directo a la etapa 2.

Principios de la casa: constancia antes que perfección; nunca dos veces seguidas sin hacer un hábito; los hábitos son el mecanismo y los resultados son la evidencia; celebrar cada avance.

Límites: no des indicaciones médicas, nutricionales ni de medicación específicas. Si aparece un tema de salud, sugerí consultarlo con un profesional y proponé solo metas y hábitos generales y seguros. No inventes datos del usuario. Tené en cuenta las metas y hábitos que ya tiene para no duplicarlos.`

const META_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'dimension', 'tipo', 'unidad', 'valor_inicial', 'valor_meta', 'descripcion'],
  properties: {
    titulo: { type: 'string', description: 'Corto y concreto, por ejemplo "Bajar a 85 kg".' },
    dimension: { type: 'string', description: 'Nombre exacto de una de las dimensiones del usuario.' },
    tipo: { type: 'string', enum: ['meta_numerica', 'conteo', 'promedio', 'proyecto'] },
    unidad: { type: ['string', 'null'] },
    valor_inicial: { type: ['number', 'null'] },
    valor_meta: { type: ['number', 'null'] },
    descripcion: { type: ['string', 'null'], description: 'Por qué importa o cómo se mide, en una oración.' },
  },
}

const HABITO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'tipo', 'dias', 'veces_semana', 'limite_semana', 'version_minima', 'metas', 'porque'],
  properties: {
    titulo: { type: 'string' },
    tipo: { type: 'string', enum: ['construir', 'reducir'] },
    dias: {
      type: ['array', 'null'],
      items: { type: 'integer' },
      description: 'Solo hábitos a construir con días fijos: 0 = domingo ... 6 = sábado. Null si usa veces_semana o es a reducir.',
    },
    veces_semana: { type: ['integer', 'null'], description: 'Solo hábitos a construir sin días fijos.' },
    limite_semana: { type: ['integer', 'null'], description: 'Solo hábitos a reducir: máximo por semana, 0 = eliminar.' },
    version_minima: { type: ['string', 'null'], description: 'Versión mínima (construir) o plan B ante la tentación (reducir).' },
    metas: { type: 'array', items: { type: 'string' }, description: 'Títulos exactos de las metas a las que contribuye.' },
    porque: { type: 'string', description: 'Por qué este hábito ayuda, en una oración.' },
  },
}

const HERRAMIENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'proponer_metas',
    description:
      'Etapa 1. Muestra al usuario de 1 a 3 metas para el ciclo. El usuario puede aceptarlas, editarlas o descartarlas; el resultado vuelve con las metas finales.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['resumen', 'metas'],
      properties: {
        resumen: { type: 'string', description: 'Una o dos oraciones sobre por qué estas metas.' },
        metas: { type: 'array', items: META_SCHEMA },
      },
    },
  },
  {
    name: 'proponer_habitos',
    description:
      'Etapa 2. Muestra al usuario los hábitos buenos y malos para sus metas ya creadas. El usuario elige cuáles crear o pide cambios.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['resumen', 'habitos'],
      properties: {
        resumen: { type: 'string', description: 'Una o dos oraciones sobre el plan de hábitos.' },
        habitos: { type: 'array', items: HABITO_SCHEMA },
      },
    },
  },
]

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Solo deja pasar mensajes con la forma que arma la app */
function mensajesValidos(mensajes: unknown): mensajes is Anthropic.Beta.BetaMessageParam[] {
  if (!Array.isArray(mensajes) || mensajes.length === 0 || mensajes.length > MAX_MENSAJES) return false
  return mensajes.every((m) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return false
    if (typeof m.content === 'string') return m.content.length <= MAX_CARACTERES_MENSAJE
    if (!Array.isArray(m.content)) return false
    if (m.role === 'assistant') return true // se devuelve tal cual lo generó el modelo, incluidos los bloques de razonamiento
    return m.content.every(
      (b: { type?: string; text?: string; content?: unknown }) =>
        (b.type === 'text' && typeof b.text === 'string' && b.text.length <= MAX_CARACTERES_MENSAJE) ||
        (b.type === 'tool_result' && (typeof b.content !== 'string' || b.content.length <= MAX_CARACTERES_MENSAJE)),
    )
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  // Quién llama: usuario logueado y habilitado para el coach (evita que cualquiera use la clave)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email?.toLowerCase()
  if (!email) return responder({ error: 'Iniciá sesión para usar el coach.' }, 401)
  const habilitados = (Deno.env.get('COACH_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (!habilitados.includes(email)) {
    return responder({ error: 'El coach con IA todavía no está habilitado para tu cuenta.' }, 403)
  }

  let cuerpo: { mensajes?: unknown; contexto?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'Pedido inválido' }, 400)
  }
  const { mensajes, contexto } = cuerpo
  if (!mensajesValidos(mensajes)) return responder({ error: 'La conversación es demasiado larga o inválida. Empezá una nueva.' }, 400)
  const textoContexto = typeof contexto === 'string' ? contexto.slice(0, MAX_CARACTERES_CONTEXTO) : ''

  const anthropic = new Anthropic() // lee ANTHROPIC_API_KEY
  try {
    const respuesta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: [
        { type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Datos actuales del usuario en la app:\n${textoContexto}` },
      ],
      tools: HERRAMIENTAS,
      messages: mensajes,
    })
    if (respuesta.stop_reason === 'refusal') {
      return responder({ error: 'Sobre eso no puedo ayudarte. Probemos por otro lado.' }, 200)
    }
    return responder({ content: respuesta.content, stop_reason: respuesta.stop_reason })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return responder({ error: 'El coach está con mucha demanda. Probá en un minuto.' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return responder({ error: 'Falta configurar la clave del coach.' }, 500)
    if (e instanceof Anthropic.BadRequestError) {
      console.error('Pedido rechazado', e.message)
      return responder({ error: 'No pude procesar la conversación. Empezá una nueva.' }, 400)
    }
    if (e instanceof Anthropic.APIError) {
      console.error('Error de la API', e.status, e.message)
      return responder({ error: 'El coach no está disponible ahora. Probá de nuevo en un rato.' }, 502)
    }
    console.error(e)
    return responder({ error: 'Algo falló. Probá de nuevo.' }, 500)
  }
})
