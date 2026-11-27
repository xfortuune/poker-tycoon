import { useState } from 'react';
import * as C from '../game/config';
import type { LimitId } from '../game/config';
import { setupEffects } from '../game/setup';
import {
  buyinEur,
  buyinsFor,
  expectedWinrate,
  handsFor,
  playEnergyCost,
  rateWinrate,
} from '../game/simulation';
import { isExhausted, maxHoursThisWeek } from '../game/week';
import { useStore } from '../store';
import { eur, num } from './format';
import Modal from './Modal';

const RATING_LABEL = { favorable: 'Favorable', ajustado: 'Ajustado', desfavorable: 'Difícil' } as const;

export default function PlayModal() {
  const game = useStore((s) => s.game)!;
  const doAction = useStore((s) => s.doAction);
  const openModal = useStore((s) => s.openModal);
  const last = game.sessions[game.sessions.length - 1];
  const fx = setupEffects(game.setup);
  const maxHours = maxHoursThisWeek(game, 'play');
  const exhausted = isExhausted(game);

  const [limit, setLimit] = useState<LimitId>(last && game.bankroll >= buyinEur(last.limit) ? last.limit : 'NL2');
  const [tables, setTables] = useState(Math.min(last?.tables ?? 2, fx.maxTables));
  const [hours, setHours] = useState(Math.min(last?.hours ?? 20, maxHours));

  const hands = handsFor(tables, hours, fx.handsMult);
  const cost = playEnergyCost(tables, hours, fx.energyCostMult);
  const bis = buyinsFor(game.bankroll, limit);
  const energyAfter = Math.max(0, game.energy - cost);

  return (
    <Modal title="Jugar sesión" onClose={() => openModal(null)} wide>
      <p className="hint">
        Elige el límite. Se recomiendan al menos {C.RECOMMENDED_BUYINS} buy-ins (1 buy-in = 100 bb).
      </p>
      <div className="limit-grid">
        {C.LIMITS.map((l) => {
          const n = buyinsFor(game.bankroll, l.id);
          const locked = n < 1;
          const wr = expectedWinrate({
            skills: game.skills,
            limit: l.id,
            tables,
            energy: game.energy,
            tilt: game.tilt,
            comfortTables: fx.comfortTables,
            skillBonus: fx.skillBonus,
          }).netWR;
          const rating = rateWinrate(wr);
          return (
            <button
              key={l.id}
              className={`limit-btn ${limit === l.id ? 'on' : ''} ${locked ? 'locked' : ''}`}
              disabled={locked}
              onClick={() => setLimit(l.id)}
            >
              <strong>{l.id}</strong>
              <span>{locked ? `🔒 ${eur(buyinEur(l.id))}` : `${Math.floor(n)} BI`}</span>
              {!locked && <span className={`rating ${rating}`}>{RATING_LABEL[rating]}</span>}
              {!locked && n < C.RECOMMENDED_BUYINS && <span className="warn-dot" title="Poco bankroll">!</span>}
            </button>
          );
        })}
      </div>

      <label className="slider">
        <span>
          Mesas: <strong>{tables}</strong> <em className="muted">(máx. {fx.maxTables} con tu ordenador)</em>
          {tables > fx.comfortTables && <em className="neg"> · más de {fx.comfortTables}: juegas peor</em>}
        </span>
        <input type="range" min={C.MIN_TABLES} max={fx.maxTables} value={tables} onChange={(e) => setTables(+e.target.value)} />
      </label>
      <label className="slider">
        <span>
          Horas esta semana: <strong>{hours}</strong>
          {hours > C.LONG_WEEK_HOURS && <em className="neg"> · más de {C.LONG_WEEK_HOURS} h cansa mucho más</em>}
        </span>
        <input type="range" min={C.MIN_PLAY_HOURS} max={maxHours} value={hours} onChange={(e) => setHours(+e.target.value)} />
      </label>

      <div className="preview">
        <div>
          Manos estimadas <strong>{num(hands)}</strong>
        </div>
        <div>
          Energía <strong>{Math.round(game.energy)} → {Math.round(energyAfter)}</strong>
        </div>
        <div>
          Bankroll en {limit} <strong className={bis < C.RECOMMENDED_BUYINS ? 'neg' : 'pos'}>{Math.floor(bis)} BI</strong>
        </div>
      </div>
      {exhausted && (
        <p className="warning">😵 Estás agotado: esta semana solo puedes jugar {C.EXHAUSTED_MAX_HOURS} h. Mejor descansa.</p>
      )}
      {bis < C.RECOMMENDED_BUYINS && (
        <p className="warning">⚠ Tienes menos de {C.RECOMMENDED_BUYINS} buy-ins para {limit}. Un downswing normal podría arruinarte.</p>
      )}
      {energyAfter <= 0 ? (
        <p className="warning">⚠ No te llega la energía: te quedarás dormido antes de acabar la sesión.</p>
      ) : (
        energyAfter < C.ENERGY_PENALTY_THRESHOLD && <p className="warning">⚠ Acabarás cansado: con poca energía juegas peor.</p>
      )}
      {game.tilt >= 40 && <p className="warning">😤 Vas con {Math.round(game.tilt)} de tilt: jugarás peor. ¿Seguro que no prefieres descansar?</p>}
      <div className="modal-actions">
        <button className="btn" onClick={() => openModal(null)}>
          Cancelar
        </button>
        <button className="btn primary" onClick={() => doAction({ type: 'play', limit, tables, hours })}>
          ¡A jugar!
        </button>
      </div>
    </Modal>
  );
}
