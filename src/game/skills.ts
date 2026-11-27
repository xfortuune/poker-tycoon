import * as C from './config';
import type { SkillId, Skills } from './types';

export const SKILL_LABELS: Record<SkillId, string> = {
  preflop: 'Preflop',
  postflop: 'Postflop',
  lectura: 'Lectura de rivales',
  mental: 'Mental game',
};

export const SKILL_IDS: SkillId[] = ['preflop', 'postflop', 'lectura', 'mental'];

export function clampSkill(v: number): number {
  return Math.max(0, Math.min(C.SKILL_MAX, v));
}

/** Rendimientos decrecientes: cuanto más sabes, menos aprendes */
export function diminishing(current: number, raw: number): number {
  return (raw * (C.SKILL_MAX - current)) / C.SKILL_MAX;
}

export function studyGain(current: number, hours: number): number {
  return diminishing(current, C.STUDY_GAIN_PER_HOUR * hours);
}

/** Experiencia por manos jugadas: sube Preflop, Postflop y Lectura */
export function playXp(skills: Skills, hands: number): Partial<Skills> {
  const raw = (C.PLAY_XP_PER_10K_HANDS * hands) / 10000;
  return {
    preflop: diminishing(skills.preflop, raw),
    postflop: diminishing(skills.postflop, raw),
    lectura: diminishing(skills.lectura, raw),
  };
}

export function applySkillDelta(skills: Skills, delta: Partial<Skills>): Skills {
  const out = { ...skills };
  for (const id of SKILL_IDS) {
    const d = delta[id];
    if (d) out[id] = clampSkill(out[id] + d);
  }
  return out;
}
