import { useState } from 'react';
import * as C from '../game/config';
import { coachDemand, coachRate } from '../game/coaching';
import { weeklyRecovery } from '../game/setup';
import { isExhausted, maxHoursThisWeek } from '../game/week';
import { useStore } from '../store';
import { d1, eur } from './format';
import Modal from './Modal';

export default function CoachModal() {
  const game = useStore((s) => s.game)!;
  const doAction = useStore((s) => s.doAction);
  const openModal = useStore((s) => s.openModal);
  const max = Math.min(C.MAX_COACH_HOURS, maxHoursThisWeek(game, 'study'));
  const demand = coachDemand(game);
  const rate = coachRate(game);
  const [hours, setHours] = useState(Math.min(max, Math.max(C.MIN_COACH_HOURS, demand)));
  const sold = Math.min(hours, demand);
  const energyAfter = Math.min(100, Math.max(0, game.energy - C.COACH_ENERGY_PER_HOUR * hours + weeklyRecovery(game)));

  return (
    <Modal title="Dar coaching" onClose={() => openModal(null)}>
      <p className="hint">
        Das clases particulares por videollamada. Tu tarifa depende del límite más alto que has jugado y de tu reputación.
        Enseñar también te hace mejorar un poco.
      </p>
      <div className="summary-grid">
        <div className="kpi">
          <span>Tarifa</span>
          <strong className="gold">{eur(rate)}/h</strong>
        </div>
        <div className="kpi">
          <span>Demanda esta semana</span>
          <strong>{demand} h</strong>
        </div>
        <div className="kpi">
          <span>Reputación</span>
          <strong>{d1(game.coaching.reputation)}</strong>
        </div>
      </div>
      <label className="slider">
        <span>
          Horas de clase: <strong>{hours}</strong>
          {hours > demand && <em className="neg"> · solo hay alumnos para {demand} h</em>}
        </span>
        <input type="range" min={Math.min(C.MIN_COACH_HOURS, max)} max={max} value={hours} onChange={(e) => setHours(+e.target.value)} />
      </label>
      <div className="preview">
        <div>
          Ingresos <strong className="pos">{eur(sold * rate)}</strong>
        </div>
        <div>
          Energía al final <strong>{Math.round(energyAfter)}</strong>
        </div>
      </div>
      {isExhausted(game) && <p className="warning">😵 Estás agotado: esta semana solo puedes trabajar {C.EXHAUSTED_MAX_HOURS} h.</p>}
      <div className="modal-actions">
        <button className="btn" onClick={() => openModal(null)}>
          Cancelar
        </button>
        <button className="btn primary" onClick={() => doAction({ type: 'coach', hours })}>
          Dar clases
        </button>
      </div>
    </Modal>
  );
}
