import * as C from './config';
import type { LimitConfig, LimitId } from './config';
import { Rng } from './rng';
import type { CurvePoint, Skills } from './types';

export function getLimit(id: LimitId): LimitConfig {
  const l = C.LIMITS.find((x) => x.id === id);
  if (!l) throw new Error(`Límite desconocido: ${id}`);
  return l;
}

export function limitIndex(id: LimitId): number {
  return C.LIMITS.findIndex((x) => x.id === id);
}

export function buyinEur(id: LimitId): number {
  return getLimit(id).bb * C.BUYIN_BB;
}

export function buyinsFor(bankroll: number, id: LimitId): number {
  return bankroll / buyinEur(id);
}

/** Habilidad técnica media ponderada (Mental actúa vía tilt) */
export function baseSkill(s: Skills): number {
  const w = C.SKILL_WEIGHTS;
  return w.preflop * s.preflop + w.postflop * s.postflop + w.lectura * s.lectura;
}

export interface WinrateInput {
  skills: Skills;
  limit: LimitId;
  tables: number;
  /** Energía media durante la sesión */
  energy: number;
  tilt: number;
  comfortTables?: number;
}

export interface WinrateBreakdown {
  skill: number;
  tablePenalty: number;
  energyPenalty: number;
  effectiveSkill: number;
  difficulty: number;
  edge: number;
  grossWR: number;
  rake: number;
  tiltPenalty: number;
  netWR: number;
}

/**
 * Winrate esperado en bb/100:
 *   S_ef  = S − pen. mesas − pen. energía
 *   E     = S_ef − dificultad
 *   bruto = 30 · tanh(E / 25)
 *   neto  = bruto − rake − 0,15 · tilt
 */
export function expectedWinrate(input: WinrateInput): WinrateBreakdown {
  const lim = getLimit(input.limit);
  const comfort = input.comfortTables ?? C.BASE_COMFORT_TABLES;
  const skill = baseSkill(input.skills);
  const tablePenalty = Math.max(0, input.tables - comfort) * C.TABLE_PENALTY;
  const energyPenalty =
    Math.max(0, C.ENERGY_PENALTY_THRESHOLD - input.energy) * C.ENERGY_PENALTY_PER_POINT;
  const effectiveSkill = skill - tablePenalty - energyPenalty;
  const edge = effectiveSkill - lim.difficulty;
  const grossWR = C.WR_SCALE * Math.tanh(edge / C.WR_SOFTNESS);
  const tiltPenalty = input.tilt * C.TILT_WR_PENALTY;
  const netWR = grossWR - lim.rake - tiltPenalty;
  return {
    skill,
    tablePenalty,
    energyPenalty,
    effectiveSkill,
    difficulty: lim.difficulty,
    edge,
    grossWR,
    rake: lim.rake,
    tiltPenalty,
    netWR,
  };
}

/** Resultado en bb de un bloque de n manos con winrate wr (bb/100) */
export function sampleHands(rng: Rng, hands: number, wr: number, sd = C.STDDEV_BB100): number {
  const k = hands / 100;
  return rng.normal(wr * k, sd * Math.sqrt(k));
}

export interface SessionInput {
  limit: LimitId;
  hands: number;
  netWR: number;
  edge: number;
  bankroll: number;
}

export interface SessionSim {
  hands: number;
  netBB: number;
  sdBB: number;
  nsdBB: number;
  rakeBB: number;
  /** € acumulados tras cada tramo */
  curveEur: number[];
  /** Muestras reducidas para guardar en el historial */
  curve: CurvePoint[];
  stoppedEarly: boolean;
  /** Neto acumulado en bb tras cada tramo */
  cumTrace: number[];
}

/**
 * Simula una sesión por tramos de CHUNK_HANDS manos.
 * Se detiene si el bankroll baja de un buy-in del límite.
 */
export function simulateSession(rng: Rng, input: SessionInput): SessionSim {
  const lim = getLimit(input.limit);
  const nsdMean = C.NSD_BASE + C.NSD_EDGE_FACTOR * input.edge;
  const buyin = lim.bb * C.BUYIN_BB;

  let played = 0;
  let net = 0;
  let nsd = 0;
  let stoppedEarly = false;
  const curveEur: number[] = [];
  const cumTrace: number[] = [];
  const full: CurvePoint[] = [];

  while (played < input.hands) {
    const n = Math.min(C.CHUNK_HANDS, input.hands - played);
    const chunkNet = sampleHands(rng, n, input.netWR);
    const chunkNsd = sampleHands(rng, n, nsdMean, C.NSD_STDDEV_BB100);
    played += n;
    net += chunkNet;
    nsd += chunkNsd;
    curveEur.push(net * lim.bb);
    cumTrace.push(net);
    full.push([played, net, net - nsd]);
    if (input.bankroll + net * lim.bb < buyin && played < input.hands) {
      stoppedEarly = true;
      break;
    }
  }

  return {
    hands: played,
    netBB: net,
    sdBB: net - nsd,
    nsdBB: nsd,
    rakeBB: (lim.rake * played) / 100,
    curveEur,
    curve: downsample(full, C.CURVE_SAMPLES_PER_SESSION),
    stoppedEarly,
    cumTrace,
  };
}

function downsample(points: CurvePoint[], n: number): CurvePoint[] {
  if (points.length <= n) return points.map(roundPoint);
  const out: CurvePoint[] = [];
  for (let i = 1; i <= n; i++) {
    const idx = Math.round((i * points.length) / n) - 1;
    out.push(roundPoint(points[idx]));
  }
  return out;
}

function roundPoint(p: CurvePoint): CurvePoint {
  return [p[0], Math.round(p[1] * 10) / 10, Math.round(p[2] * 10) / 10];
}

export function vipLevelFor(rakeLastMonthEur: number) {
  let level: (typeof C.VIP_LEVELS)[number] = C.VIP_LEVELS[0];
  for (const l of C.VIP_LEVELS) if (rakeLastMonthEur >= l.minRakeEur) level = l;
  return level;
}

export function handsFor(tables: number, hours: number): number {
  return Math.round(C.HANDS_PER_HOUR_PER_TABLE * tables * hours);
}

export function playEnergyCost(tables: number, hours: number): number {
  return hours * (C.PLAY_ENERGY_PER_HOUR_BASE + C.PLAY_ENERGY_PER_HOUR_PER_TABLE * tables);
}

export type LimitRating = 'favorable' | 'ajustado' | 'desfavorable';

export function rateWinrate(wr: number): LimitRating {
  if (wr >= 3) return 'favorable';
  if (wr >= -2) return 'ajustado';
  return 'desfavorable';
}
