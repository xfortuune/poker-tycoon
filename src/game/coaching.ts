import * as C from './config';
import { baseSkill } from './simulation';
import { diminishing } from './skills';
import type { CoachingState, CoachOutcome, GameState, Skills } from './types';

export function newCoachingState(): CoachingState {
  return { reputation: 0, hours: 0, incomeEur: 0, students: 0 };
}

export function coachUnlocked(state: GameState): boolean {
  return state.career.maxLimitIndex >= C.COACH_UNLOCK_LIMIT_INDEX && state.fame >= C.COACH_UNLOCK_FAME;
}

export function coachMissing(state: GameState): string[] {
  const out: string[] = [];
  if (state.career.maxLimitIndex < C.COACH_UNLOCK_LIMIT_INDEX) out.push(`Haber jugado ${C.LIMITS[C.COACH_UNLOCK_LIMIT_INDEX].id}`);
  if (state.fame < C.COACH_UNLOCK_FAME) out.push(`Tener ${C.COACH_UNLOCK_FAME} de fama (ahora ${Math.floor(state.fame)})`);
  return out;
}

/** Tarifa por hora según tu límite máximo y tu reputación */
export function coachRate(state: GameState): number {
  const idx = Math.max(0, state.career.maxLimitIndex);
  return C.COACH_RATE_BASE * Math.pow(C.COACH_RATE_GROWTH, idx) + C.COACH_RATE_PER_REP * state.coaching.reputation;
}

/** Horas de clase que te piden los alumnos esta semana */
export function coachDemand(state: GameState): number {
  return Math.floor(
    C.COACH_DEMAND_BASE + C.COACH_DEMAND_PER_FAME * state.fame + C.COACH_DEMAND_PER_REP * state.coaching.reputation,
  );
}

/** Semana dando clases. Muta `s` y devuelve el resultado y la experiencia ganada. */
export function applyCoachWeek(s: GameState, hours: number): { outcome: CoachOutcome; xp: Partial<Skills> } {
  const co = { ...s.coaching };
  const rate = coachRate(s);
  const sold = Math.min(hours, coachDemand(s));
  const income = sold * rate;
  const skill = baseSkill(s.skills);
  const repBefore = co.reputation;
  co.reputation = Math.min(100, co.reputation + diminishing(co.reputation, sold * C.COACH_REP_PER_HOUR * (skill / 50)));
  co.hours += sold;
  co.incomeEur += income;
  co.students = Math.max(sold > 0 ? 1 : 0, Math.round(sold / C.COACH_HOURS_PER_STUDENT));
  s.coaching = co;
  s.bankroll += income;
  const raw = sold * C.COACH_XP_PER_HOUR;
  return {
    outcome: {
      hoursOffered: hours,
      hoursSold: sold,
      rate,
      incomeEur: income,
      students: co.students,
      reputationDelta: co.reputation - repBefore,
    },
    xp: { preflop: diminishing(s.skills.preflop, raw), postflop: diminishing(s.skills.postflop, raw) },
  };
}
