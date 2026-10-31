/** Rueda de la vida: un eje por categoría, puntaje de 1 a 10 */
export default function Rueda({ ejes }: { ejes: { nombre: string; valor: number | null }[] }) {
  const tam = 300
  const c = tam / 2
  const radio = 100
  const n = ejes.length
  if (n < 3) return null
  const punto = (i: number, v: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2
    return [c + Math.cos(ang) * radio * (v / 10), c + Math.sin(ang) * radio * (v / 10)] as const
  }
  const conValor = ejes.every((e) => e.valor != null)
  const poligono = ejes.map((e, i) => punto(i, e.valor ?? 0).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${tam} ${tam}`} className="mx-auto w-full max-w-sm" role="img" aria-label="Rueda de la vida con la satisfacción por categoría">
      {[2, 4, 6, 8, 10].map((r) => (
        <polygon
          key={r}
          points={ejes.map((_, i) => punto(i, r).join(',')).join(' ')}
          fill="none"
          stroke="currentColor"
          className="text-slate-800"
          strokeWidth={1}
        />
      ))}
      {ejes.map((e, i) => {
        const [x, y] = punto(i, 10)
        const [lx, ly] = punto(i, 12.6)
        const ancla = Math.abs(lx - c) < 8 ? 'middle' : lx > c ? 'start' : 'end'
        const palabras = e.nombre.split(' ')
        const corte = Math.ceil(palabras.length / 2)
        return (
          <g key={e.nombre}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="currentColor" className="text-slate-800" strokeWidth={1} />
            <text x={lx} y={ly} textAnchor={ancla} className="fill-slate-400 text-[10px]">
              <tspan x={lx} dy="-0.2em">
                {palabras.slice(0, corte).join(' ')}
              </tspan>
              <tspan x={lx} dy="1.1em">
                {palabras.slice(corte).join(' ')}
              </tspan>
            </text>
          </g>
        )
      })}
      {ejes.some((e) => e.valor != null) && (
        <polygon
          points={poligono}
          className="fill-violet-400/20 stroke-violet-300"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeDasharray={conValor ? undefined : '4 3'}
        />
      )}
      {ejes.map((e, i) => {
        if (e.valor == null) return null
        const [x, y] = punto(i, e.valor)
        return (
          <g key={`p-${e.nombre}`}>
            <circle cx={x} cy={y} r={10} fill="transparent">
              <title>
                {e.nombre}: {e.valor} de 10
              </title>
            </circle>
            <circle cx={x} cy={y} r={4} className="fill-violet-300 stroke-slate-950" strokeWidth={2} pointerEvents="none" />
          </g>
        )
      })}
    </svg>
  )
}
