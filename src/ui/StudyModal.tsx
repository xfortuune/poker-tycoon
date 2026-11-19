import { useState } from 'react';
import * as C from '../game/config';
import { SKILL_IDS, SKILL_LABELS, studyGain } from '../game/skills';
import type { SkillId } from '../game/types';
import { useStore } from '../store';
import { d1 } from './format';
import Modal from './Modal';

const DESC: Record<SkillId, string> = {
  preflop: 'Rangos de apertura, 3-bet y defensa de ciegas.',
  postflop: 'C-bets, tamaños de apuesta y líneas en el river.',
  lectura: 'Detectar leaks de los rivales y explotarlos.',
  mental: 'Controlar el tilt y aguantar los downswings.',
};

export default function StudyModal() {
  const game = useStore((s) => s.game)!;
  const doAction = useStore((s) => s.doAction);
  const openModal = useStore((s) => s.openModal);
  const [topic, setTopic] = useState<SkillId>('postflop');
  const [hours, setHours] = useState(20);
  const energyAfter = Math.min(100, Math.max(0, game.energy - C.STUDY_ENERGY_PER_HOUR * hours + C.WEEKLY_ENERGY_RECOVERY));

  return (
    <Modal title="Estudiar" onClose={() => openModal(null)}>
      <div className="topic-list">
        {SKILL_IDS.map((id) => (
          <button key={id} className={`topic-btn ${topic === id ? 'on' : ''}`} onClick={() => setTopic(id)}>
            <span className="topic-name">{SKILL_LABELS[id]}</span>
            <span className="topic-desc">{DESC[id]}</span>
            <span className="skill-bar">
              <i style={{ width: `${game.skills[id]}%` }} />
            </span>
            <span className="topic-val">{d1(game.skills[id])}</span>
          </button>
        ))}
      </div>
      <label className="slider">
        <span>
          Horas de estudio: <strong>{hours}</strong>
        </span>
        <input
          type="range"
          min={C.MIN_STUDY_HOURS}
          max={C.MAX_STUDY_HOURS}
          value={hours}
          onChange={(e) => setHours(+e.target.value)}
        />
      </label>
      <div className="preview">
        <div>
          {SKILL_LABELS[topic]} <strong className="pos">+{d1(studyGain(game.skills[topic], hours))}</strong>
        </div>
        <div>
          Energía al final de la semana <strong>{Math.round(energyAfter)}</strong>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={() => openModal(null)}>
          Cancelar
        </button>
        <button className="btn primary" onClick={() => doAction({ type: 'study', topic, hours })}>
          Estudiar
        </button>
      </div>
    </Modal>
  );
}
