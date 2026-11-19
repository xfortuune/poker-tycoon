import { useMemo, useState } from 'react';
import * as C from '../game/config';
import type { LimitId } from '../game/config';
import { bb100, buildGraph, filterSessions, maxDrawdown, type GraphPeriod, type GraphUnit } from '../game/stats';
import { useStore } from '../store';
import { d1, eur, num, signed1, signedEur, tone } from './format';
import LineChart from './LineChart';
import Modal from './Modal';

export default function GraphModal() {
  const game = useStore((s) => s.game)!;
  const openModal = useStore((s) => s.openModal);
  const [limit, setLimit] = useState<LimitId | 'todos'>('todos');
  const [period, setPeriod] = useState<GraphPeriod>('todo');
  const [unit, setUnit] = useState<GraphUnit>('eur');

  const played = C.LIMITS.filter((l) => game.limitStats[l.id]);
  const sessions = useMemo(() => filterSessions(game, limit, period), [game, limit, period]);
  const pts = useMemo(() => buildGraph(sessions, unit), [sessions, unit]);
  const hands = sessions.reduce((a, s) => a + s.hands, 0);
  const netBB = sessions.reduce((a, s) => a + s.netBB, 0);
  const netEur = sessions.reduce((a, s) => a + s.netEur, 0);
  const last = pts[pts.length - 1];
  const fmt = unit === 'eur' ? (v: number) => eur(v) : (v: number) => `${num(v)} bb`;

  return (
    <Modal title="Gráfica de ganancias" onClose={() => openModal(null)} wide>
      <div className="filters">
        <label>
          Límite
          <select value={limit} onChange={(e) => setLimit(e.target.value as LimitId | 'todos')}>
            <option value="todos">Todos</option>
            {played.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Periodo
          <select value={period} onChange={(e) => setPeriod(e.target.value as GraphPeriod)}>
            <option value="todo">Toda la carrera</option>
            <option value="año">Último año</option>
            <option value="12sem">Últimas 12 semanas</option>
          </select>
        </label>
        <label>
          Unidad
          <select value={unit} onChange={(e) => setUnit(e.target.value as GraphUnit)}>
            <option value="eur">€</option>
            <option value="bb">Ciegas grandes</option>
          </select>
        </label>
      </div>
      <LineChart
        formatY={fmt}
        formatX={(v) => num(v)}
        xLabel="manos"
        series={[
          { label: 'Ganancias netas', color: 'var(--c-green)', points: pts.map((p) => [p.hands, p.net]) },
          { label: 'Showdown', color: 'var(--c-blue)', points: pts.map((p) => [p.hands, p.sd]) },
          { label: 'Non-showdown', color: 'var(--c-red)', points: pts.map((p) => [p.hands, p.nsd]) },
        ]}
      />
      <div className="summary-grid">
        <div className="kpi">
          <span>Manos</span>
          <strong>{num(hands)}</strong>
        </div>
        <div className="kpi">
          <span>Ganancias</span>
          <strong className={tone(netEur)}>{signedEur(netEur)}</strong>
        </div>
        <div className="kpi">
          <span>bb/100</span>
          <strong className={tone(netBB)}>{signed1(bb100(netBB, hands))}</strong>
        </div>
        <div className="kpi">
          <span>Mayor bajón ({unit === 'eur' ? '€' : 'bb'})</span>
          <strong className="neg">{unit === 'eur' ? eur(maxDrawdown(pts.map((p) => p.net))) : d1(maxDrawdown(pts.map((p) => p.net)))}</strong>
        </div>
        <div className="kpi">
          <span>Showdown</span>
          <strong className={tone(last.sd)}>{fmt(last.sd)}</strong>
        </div>
        <div className="kpi">
          <span>Non-showdown</span>
          <strong className={tone(last.nsd)}>{fmt(last.nsd)}</strong>
        </div>
      </div>
      <p className="muted small">El mayor bajón se calcula sobre los puntos guardados de la gráfica; en Estadísticas está el valor exacto.</p>
    </Modal>
  );
}
