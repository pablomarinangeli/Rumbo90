import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BotonPrimario, BotonSecundario, Campo, Volver, inputClase } from '../components/ui'
import { OBJETIVO_CAMPOS, TIPOS_OBJETIVO, type Ciclo, type Dimension, type Objetivo } from '../lib/datos'
import { supabase } from '../lib/supabase'

const numero = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

export default function ObjetivoForm({ ciclo }: { ciclo: Ciclo }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [dimensiones, setDimensiones] = useState<Dimension[]>([])
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'meta_numerica' as Objetivo['tipo'],
    unidad: '',
    valor_inicial: '',
    valor_meta: '',
    dimension_id: params.get('dimension') ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('dimensiones')
      .select('id, nombre, orden')
      .eq('ciclo_id', ciclo.id)
      .order('orden')
      .then(({ data }) => setDimensiones(data ?? []))
    if (!id) return
    supabase
      .from('objetivos')
      .select(OBJETIVO_CAMPOS)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return
        const o = data as Objetivo
        setForm({
          titulo: o.titulo,
          descripcion: o.descripcion ?? '',
          tipo: o.tipo,
          unidad: o.unidad ?? '',
          valor_inicial: o.valor_inicial?.toString() ?? '',
          valor_meta: o.valor_meta?.toString() ?? '',
          dimension_id: o.dimension_id ?? '',
        })
      })
  }, [ciclo.id, id])

  const cambiar = (campo: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }))

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const datos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      unidad: form.unidad.trim() || null,
      valor_inicial: form.tipo === 'proyecto' ? null : numero(form.valor_inicial),
      valor_meta: form.tipo === 'proyecto' ? null : numero(form.valor_meta),
      dimension_id: form.dimension_id || null,
    }
    const { data, error } = id
      ? await supabase.from('objetivos').update(datos).eq('id', id).select('id').single()
      : await supabase
          .from('objetivos')
          .insert({ ...datos, ciclo_id: ciclo.id, fecha_meta: ciclo.fecha_fin })
          .select('id')
          .single()
    if (error || !data) {
      setError(error?.message ?? 'No se pudo guardar')
      setGuardando(false)
      return
    }
    navigate(`/metas/${data.id}`, { replace: true })
  }

  const eliminar = async () => {
    if (!id || !confirm('¿Eliminar esta meta y sus mediciones?')) return
    await supabase.from('objetivos').delete().eq('id', id)
    navigate('/metas', { replace: true })
  }

  return (
    <form onSubmit={(e) => void guardar(e)} className="space-y-4">
      <Volver onClick={() => navigate(-1)} />
      <h1 className="text-2xl font-bold">{id ? 'Editar meta' : 'Nueva meta'}</h1>

      <Campo etiqueta="Qué querés lograr">
        <input required value={form.titulo} onChange={cambiar('titulo')} className={inputClase} placeholder="Ej. Llegar a mi peso objetivo" />
      </Campo>
      <Campo etiqueta="Dimensión">
        <select value={form.dimension_id} onChange={cambiar('dimension_id')} className={inputClase}>
          {dimensiones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Tipo de meta">
        <select value={form.tipo} onChange={cambiar('tipo')} className={inputClase}>
          {Object.entries(TIPOS_OBJETIVO).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </Campo>
      {form.tipo !== 'proyecto' && (
        <>
          <Campo etiqueta="Unidad">
            <input value={form.unidad} onChange={cambiar('unidad')} className={inputClase} placeholder="kg, libros, horas…" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Valor inicial">
              <input inputMode="decimal" value={form.valor_inicial} onChange={cambiar('valor_inicial')} className={inputClase} />
            </Campo>
            <Campo etiqueta="Meta">
              <input inputMode="decimal" value={form.valor_meta} onChange={cambiar('valor_meta')} className={inputClase} />
            </Campo>
          </div>
        </>
      )}
      <Campo etiqueta="Notas (opcional)">
        <textarea value={form.descripcion} onChange={cambiar('descripcion')} rows={2} className={inputClase} />
      </Campo>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <BotonPrimario type="submit" disabled={guardando}>
          Guardar
        </BotonPrimario>
        {id && (
          <BotonSecundario type="button" onClick={() => void eliminar()}>
            Eliminar
          </BotonSecundario>
        )}
      </div>
    </form>
  )
}
