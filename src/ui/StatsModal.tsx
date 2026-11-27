import * as C from '../game/config';
import { currentItem, getHome } from '../game/setup';
import { baseSkill, vipLevelFor } from '../game/simulation';
import { SKILL_IDS, SKILL_LABELS } from '../game/skills';
import { bb100 } from '../game/stats';
import { useStore } from '../store';
import { d1, eur, num, signed1, signedEur, tone } from './format';
import Modal from './Modal';

export default function StatsModal() {
  const game = useStore((s) => s.game)!;
  const openModal = useStore((s) => s.openModal);
  const c = game.career;
  const vip = vipLevelFor(game.rakeHistory.reduce((a, b) => a + b, 0));
  const nextVip = C.VIP_LEVELS.find((l) => l.minRakeEur > vip.minRakeEur);
  const monthRake = game.rakeHistory.reduce((a, b) => a + b, 0);

  return (
    <Modal title="Estadísticas" onClose={() => openModal(null)} wide>
      <h3>Habilidades</h3>
      <div className="skills">
        {SKILL_IDS.map((id) => (
          <div key={id} className="skill-row">
            <span>{SKILL_LABELS[id]}</span>
            <span className="skill-bar">
              <i style={{ width: `${game.skills[id]}%` }} />
            </span>
            <strong>{d1(game.skills[id])}</strong>
          </div>
        ))}
        <div className="skill-row total">
          <span>Nivel técnico</span>
          <span className="skill-bar">
            <i style={{ width: `${baseSkill(game.skills)}%` }} />
          </span>
          <strong>{d1(baseSkill(game.skills))}</strong>
        </div>
      </div>

      <h3>Carrera</h3>
      <div className="summary-grid">
        <div className="kpi">
          <span>Manos totales</span>
          <strong>{num(c.hands)}</strong>
        </div>
        <div className="kpi">
          <span>Ganancias en mesa</span>
          <strong className={tone(c.netEur)}>{signedEur(c.netEur)}</strong>
        </div>
        <div className="kpi">
          <span>Rake pagado</span>
          <strong className="neg">{eur(c.rakeEur)}</strong>
        </div>
        <div className="kpi">
          <span>Rakeback cobrado</span>
          <strong className="pos">{eur(c.rakebackEur)}</strong>
        </div>
        <div className="kpi">
          <span>Mayor downswing</span>
          <strong className="neg">{eur(c.maxDownswingEur)}</strong>
        </div>
        <div className="kpi">
          <span>Bancarrotas</span>
          <strong>{c.busts}</strong>
        </div>
        <div className="kpi">
          <span>Peor downswing</span>
          <strong className="neg">{d1(c.maxDownswingBI)} BI</strong>
        </div>
        <div className="kpi">
          <span>Bad beats y coolers</span>
          <strong>{c.badBeats}</strong>
        </div>
        <div className="kpi">
          <span>Gastos fijos pagados</span>
          <strong className="neg">{eur(c.expensesEur)}</strong>
        </div>
      </div>

      <h3>Tu setup</h3>
      <ul className="setup-list">
        {C.UPGRADE_CATEGORIES.map(({ id, name }) => (
          <li key={id}>
            {name}: <strong>{currentItem(game.setup, id).name}</strong>
          </li>
        ))}
        <li>
          Vivienda: <strong>{getHome(game.home).name}</strong>
        </li>
      </ul>

      <h3>Por límite</h3>
      <div className="table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <th>Límite</th>
              <th>Manos</th>
              <th>bb/100</th>
              <th>Ganancias</th>
              <th>Peor bajón</th>
            </tr>
          </thead>
          <tbody>
            {C.LIMITS.filter((l) => game.limitStats[l.id]).map((l) => {
              const s = game.limitStats[l.id]!;
              return (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{num(s.hands)}</td>
                  <td className={tone(s.netBB)}>{signed1(bb100(s.netBB, s.hands))}</td>
                  <td className={tone(s.netEur)}>{signedEur(s.netEur)}</td>
                  <td className="neg">{d1(s.maxDownswingBB / C.BUYIN_BB)} BI</td>
                </tr>
              );
            })}
            {Object.keys(game.limitStats).length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Todavía no has jugado ninguna sesión.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3>{C.ROOM_NAME} · VIP</h3>
      <p>
        Nivel actual: <strong className="gold">{vip.name}</strong> ({Math.round(vip.rakeback * 100)} % de rakeback). Rake
        del último mes: {eur(monthRake)}.
        {nextVip && (
          <>
            {' '}
            Siguiente nivel: {nextVip.name} con {eur(nextVip.minRakeEur)} de rake en {C.VIP_WINDOW_WEEKS} semanas.
          </>
        )}
      </p>
    </Modal>
  );
}
