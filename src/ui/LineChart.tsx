interface Series {
  label: string;
  color: string;
  points: [number, number][];
}

interface Props {
  series: Series[];
  height?: number;
  xLabel?: string;
  formatY?: (v: number) => string;
  formatX?: (v: number) => string;
}

const W = 600;

/** Gráfica de líneas en SVG con estética retro (sin librerías) */
export default function LineChart({ series, height = 260, xLabel, formatY = String, formatX = String }: Props) {
  const all = series.flatMap((s) => s.points);
  const pad = { l: 64, r: 12, t: 12, b: 28 };
  const H = height;
  if (all.length < 2) {
    return <div className="chart-empty">Aún no hay datos. ¡Juega alguna sesión!</div>;
  }
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs, xMin + 1);
  let yMin = Math.min(0, ...ys);
  let yMax = Math.max(0, ...ys);
  if (yMax - yMin < 1e-9) {
    yMax += 1;
    yMin -= 1;
  }
  const span = yMax - yMin;
  yMax += span * 0.05;
  yMin -= span * 0.05;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);
  // El margen izquierdo se adapta a la etiqueta más larga del eje Y
  pad.l = Math.max(48, 14 + Math.max(...yTicks.map((v) => formatY(v).length)) * 7.5);
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const xTicks = Array.from({ length: 4 }, (_, i) => xMin + ((xMax - xMin) * (i + 1)) / 4);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Gráfica de ganancias">
        <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} className="chart-bg" />
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} className="chart-grid" />
            <text x={pad.l - 6} y={sy(v) + 4} textAnchor="end" className="chart-tick">
              {formatY(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v, i) => (
          <text key={i} x={sx(v)} y={H - 8} textAnchor="middle" className="chart-tick">
            {formatX(v)}
          </text>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} className="chart-zero" />
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            points={s.points.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')}
          />
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        {xLabel && <span className="muted">Eje X: {xLabel}</span>}
      </div>
    </div>
  );
}
