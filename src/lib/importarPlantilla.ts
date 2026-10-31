import { supabase } from './supabase'
import type { PlantillaCiclo } from '../plantillas/tipos'

function check<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message)
  return data as NonNullable<T>
}

/** Crea en la cuenta del usuario actual un ciclo completo a partir de una plantilla */
export async function importarPlantilla(p: PlantillaCiclo): Promise<string> {
  const ciclo = check(
    await supabase
      .from('ciclos')
      .insert({ nombre: p.nombre, fecha_inicio: p.fecha_inicio, fecha_fin: p.fecha_fin })
      .select('id')
      .single(),
  )

  const idsPorCodigo = new Map<string, string>()

  // Las 6 categorías y sus 18 subcategorías se crean en la base, siempre iguales para todos
  check(await supabase.rpc('crear_categorias_base', { p_ciclo: ciclo.id }))
  const dimensiones = check(await supabase.from('dimensiones').select('id, nombre, orden').eq('ciclo_id', ciclo.id))
  const subcategorias = check(
    await supabase
      .from('subcategorias')
      .select('id, nombre, dimension_id')
      .in('dimension_id', dimensiones.map((d) => d.id)),
  )

  for (const dim of p.dimensiones) {
    let dimension = dimensiones.find((d) => d.nombre === dim.nombre)
    if (!dimension) {
      dimension = check(
        await supabase
          .from('dimensiones')
          .insert({ ciclo_id: ciclo.id, nombre: dim.nombre, orden: dimensiones.length })
          .select('id, nombre, orden')
          .single(),
      )
    }
    const dimensionId = dimension.id
    for (const { hitos, subcategoria, ...obj } of dim.objetivos) {
      const subcategoria_id =
        subcategorias.find((s) => s.dimension_id === dimensionId && s.nombre === subcategoria)?.id ?? null
      const objetivo = check(
        await supabase
          .from('objetivos')
          .insert({ ...obj, ciclo_id: ciclo.id, dimension_id: dimensionId, subcategoria_id, fecha_meta: p.fecha_fin })
          .select('id')
          .single(),
      )
      idsPorCodigo.set(obj.codigo, objetivo.id)
      if (hitos?.length) {
        check(
          await supabase
            .from('hitos')
            .insert(hitos.map((titulo, i) => ({ objetivo_id: objetivo.id, titulo, orden: i }))),
        )
      }
    }
  }

  for (const { objetivos, ...hab } of p.habitos) {
    const habito = check(
      await supabase.from('habitos').insert({ ...hab, ciclo_id: ciclo.id }).select('id').single(),
    )
    const vinculos = objetivos
      .map((codigo) => idsPorCodigo.get(codigo))
      .filter((id): id is string => Boolean(id))
      .map((objetivo_id) => ({ habito_id: habito.id, objetivo_id }))
    if (vinculos.length) check(await supabase.from('habitos_objetivos').insert(vinculos))
  }

  return ciclo.id
}
