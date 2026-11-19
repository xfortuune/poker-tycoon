import { CHUNK_HANDS } from '../game/config';
import { calendar } from '../game/state';
import { SKILL_IDS, SKILL_LABELS } from '../game/skills';
import { bb100 } from '../game/stats';
import { useStore } from '../store';
import { d1, eur, num, pct, signed1, signedEur, tone } from './format';
import LineChart from './LineChart';
import Modal from './Modal';

export default function SummaryModal() {
  const r = useStore((s) => s.summary)!;
  const close = useStore((s) => s.closeSummary);
  const cal = calendar(r.before.week);
  const p = r.play;

  const skillChanges = SKILL_IDS.filter((id) => Math.abs(r.skillDelta[id] ?? 0) >= 0.05);

  return (
    <Modal title={`Resumen · Año ${cal.year}, semana ${cal.week}`} onClose={close} wide>
      {r.busted && <p className="warning big">💸 ¡Bancarrota! Has vuelto a empezar desde abajo.</p>}

      {p && (
        <>
          <div className="summary-grid">
            <div className="kpi">
              <span>Resultado</span>
              <strong className={tone(p.netEur)}>{signedEur(p.netEur)}</strong>
            </div>
            <div className="kpi">
              <span>bb/100</span>
              <strong className={tone(p.netBB)}>{signed1(bb100(p.netBB, p.hands))}</strong>
            </div>
            <div className="kpi">
              <span>Manos</span>
              <strong>{num(p.hands)}</strong>
            </div>
            <div className="kpi">
              <span>Rake pagado</span>
              <strong className="neg">{eur(p.rakeEur)}</strong>
            </div>
            <div className="kpi">
              <span>
                Rakeback ({p.vipLevel}, {pct(p.rakebackRate)})
              </span>
              <strong className="pos">{signedEur(p.rakebackEur)}</strong>
            </div>
            <div className="kpi">
              <span>Buy-ins</span>
              <strong className={tone(p.netBB)}>{signed1(p.netBB / 100)}</strong>
            </div>
          </div>
          <LineChart
            height={180}
            formatY={(v) => eur(v)}
            formatX={(v) => num(v)}
            xLabel="manos"
            series={[
              {
                label: 'Ganancias',
                color: 'var(--c-green)',
                points: [[0, 0], ...p.curveEur.map((v, i): [number, number] => [Math.min(p.hands, (i + 1) * CHUNK_HANDS), v])],
              },
            ]}
          />
          <p className="muted small">
            {p.limit} · {p.tables} mesa{p.tables > 1 ? 's' : ''} · showdown {signed1(p.sdBB)} bb · non-showdown{' '}
            {signed1(p.nsdBB)} bb
          </p>
        </>
      )}

      {!p && r.action.type === 'study' && <p className="lead">Has pasado la semana estudiando. 📚</p>}
      {!p && r.action.type === 'rest' && <p className="lead">Has desconectado y recargado pilas. 🌙</p>}

      <h3>Cambios</h3>
      <ul className="changes">
        <li>
          Bankroll: {eur(r.before.bankroll)} → <strong>{eur(r.after.bankroll)}</strong>{' '}
          <span className={tone(r.bankrollDelta)}>({signedEur(r.bankrollDelta)})</span>
        </li>
        <li>
          Energía: {Math.round(r.before.energy)} → <strong>{Math.round(r.after.energy)}</strong>
        </li>
        <li>
          Tilt: {Math.round(r.before.tilt)} → <strong>{Math.round(r.after.tilt)}</strong>
        </li>
        {skillChanges.map((id) => (
          <li key={id}>
            {SKILL_LABELS[id]}: {d1(r.before.skills[id])} → <strong>{d1(r.after.skills[id])}</strong>{' '}
            <span className={tone(r.skillDelta[id] ?? 0)}>({signed1(r.skillDelta[id] ?? 0)})</span>
          </li>
        ))}
      </ul>
      {r.messages.length > 0 && (
        <ul className="messages">
          {r.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
      <div className="modal-actions">
        <button className="btn primary" onClick={close}>
          Continuar
        </button>
      </div>
    </Modal>
  );
}
