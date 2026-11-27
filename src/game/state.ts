import * as C from './config';
import { randomSeed } from './rng';
import type { GameState } from './types';

export function newGame(seed: number = randomSeed()): GameState {
  return {
    version: C.SAVE_VERSION,
    seed,
    rng: seed,
    week: 0,
    bankroll: C.START_BANKROLL,
    skills: {
      preflop: C.START_SKILL,
      postflop: C.START_SKILL,
      lectura: C.START_SKILL,
      mental: C.START_SKILL,
    },
    energy: C.START_ENERGY,
    tilt: 0,
    fame: 0,
    followers: 0,
    moral: C.HOMES[0].moral,
    home: 'habitacion',
    setup: { silla: 0, monitores: 0, pc: 0, software: 0 },
    downswing: { cumBI: 0, peakBI: 0, announced: 0 },
    rakeHistory: [],
    limitStats: {},
    sessions: [],
    career: {
      hands: 0,
      netEur: 0,
      rakeEur: 0,
      rakebackEur: 0,
      cumEur: 0,
      peakEur: 0,
      maxDownswingEur: 0,
      busts: 0,
      maxLimitIndex: -1,
      weeksPlayed: 0,
      weeksStudied: 0,
      weeksRested: 0,
      expensesEur: 0,
      spentEur: 0,
      maxDownswingBI: 0,
      badBeats: 0,
      moves: 0,
    },
    createdAt: Date.now(),
  };
}

/** Semana (1–52) y año (1–10) a partir de las semanas transcurridas */
export function calendar(week: number): { week: number; year: number } {
  return { week: (week % C.WEEKS_PER_YEAR) + 1, year: Math.floor(week / C.WEEKS_PER_YEAR) + 1 };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
