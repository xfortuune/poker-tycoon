import * as C from './config';
import type { LimitConfig, LimitId } from './config';
import { Rng } from './rng';
import type { CurvePoint, DownswingState, SessionEvent, Skills } from './types';

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
  energy: number;
  tilt: number;
  comfortTables?: number;
  /** Puntos extra de habilidad efectiva (HUD, software) */
  skillBonus?: number;
}

export interface WinrateBreakdown {
  skill: number;
  skillBonus: number;
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
 *   S_ef  = S + bonus software − pen. mesas − pen. energía
 *   E     = S_ef − dificultad
 *   bruto = 30 · tanh(E / 25)
 *   neto  = bruto − rake − 0,15 · tilt
 */
export function expectedWinrate(input: WinrateInput): WinrateBreakdown {
  const lim = getLimit(input.limit);
  const comfort = input.comfortTables ?? C.BASE_COMFORT_TABLES;
  const skill = baseSkill(input.skills);
  const skillBonus = input.skillBonus ?? 0;
  const tablePenalty = Math.max(0, input.tables - comfort) * C.TABLE_PENALTY;
  const energyPenalty =
    Math.max(0, C.ENERGY_PENALTY_THRESHOLD - input.energy) * C.ENERGY_PENALTY_PER_POINT;
  const effectiveSkill = skill + skillBonus - tablePenalty - energyPenalty;
  const edge = effectiveSkill - lim.difficulty;
  const grossWR = C.WR_SCALE * Math.tanh(edge / C.WR_SOFTNESS);
  const tiltPenalty = input.tilt * C.TILT_WR_PENALTY;
  const netWR = grossWR - lim.rake - tiltPenalty;
  return {
    skill,
    skillBonus,
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
  bankroll: number;
  skills: Skills;
  tables: number;
  comfortTables?: number;
  skillBonus?: number;
  /** Energía al empezar */
  energy: number;
  /** Energía que cuesta cada mano */
  energyPerHand: number;
  /** Tilt al empezar */
  tilt: number;
  /** Downswing de la carrera (para los eventos de 10/20/30 buy-ins) */
  downswing: DownswingState;
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
  /** Neto acumulado en bb tras cada tramo */
  cumTrace: number[];
  stoppedEarly: boolean;
  stopReason?: 'bankroll' | 'energia';
  events: SessionEvent[];
  startWR: number;
  /** Winrate medio aplicado, ponderado por manos */
  avgWR: number;
  endTilt: number;
  endEnergy: number;
  downswing: DownswingState;
  /** Mayor downswing de carrera (BI) observado durante la sesión */
  maxDownswingBI: number;
}

const BAD_BEATS = [
  'Tus ases pierden contra 7-2 en el river.',
  'Color en el turn… y el rival liga full en el river.',
  'All-in con KK contra QQ: dama en el flop.',
  'Tu trío cae contra una escalera runner-runner.',
  'El rival paga tres calles con proyecto de color y lo liga.',
];
const COOLERS = [
  'Set contra set más alto.',
  'Color contra color mayor.',
  'Full contra póker en el river.',
  'KK contra AA preflop. Nada que hacer.',
];
const HERO_CALLS = [
  '¡Hero call en el river con segunda pareja! Iba de farol.',
  'Pagas con as alto… ¡y aciertas!',
  'Triple barrel de farol y el rival tira la mejor mano.',
  'Slowplay perfecto: el rival se estrella contra tu full.',
];

function pick<T>(rng: Rng, xs: T[]): T {
  return xs[Math.floor(rng.next() * xs.length)];
}

const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

/**
 * Simula una sesión por tramos de CHUNK_HANDS manos. En cada tramo se recalcula el
 * winrate con el tilt y la energía de ese momento, así que una racha mala puede
 * llevarte al tilt y hacerte jugar peor el resto de la sesión.
 * Se detiene si el bankroll baja de un buy-in del límite o si la energía llega a 0.
 */
export function simulateSession(rng: Rng, input: SessionInput): SessionSim {
  const lim = getLimit(input.limit);
  const buyin = lim.bb * C.BUYIN_BB;
  const mentalF = 1 - input.skills.mental / C.TILT_MENTAL_DIVISOR;

  let played = 0;
  let net = 0;
  let nsd = 0;
  let wrSum = 0;
  let tilt = input.tilt;
  let energy = input.energy;
  let sessionLow = 0;
  let sessionHigh = 0;
  let stopReason: SessionSim['stopReason'];
  const ds: DownswingState = { ...input.downswing };
  let maxDD = 0;
  const events: SessionEvent[] = [];
  const curveEur: number[] = [];
  const cumTrace: number[] = [];
  const full: CurvePoint[] = [];

  const wrNow = () =>
    expectedWinrate({
      skills: input.skills,
      limit: input.limit,
      tables: input.tables,
      energy,
      tilt,
      comfortTables: input.comfortTables,
      skillBonus: input.skillBonus,
    });
  const startWR = wrNow().netWR;

  const addTilt = (raw: number) => {
    const fatigue = energy < C.TILT_FATIGUE_THRESHOLD ? C.TILT_FATIGUE_MULT : 1;
    const d = raw > 0 ? raw * mentalF * fatigue : raw;
    const before = tilt;
    tilt = clamp100(tilt + d);
    return tilt - before;
  };

  while (played < input.hands) {
    const n = Math.min(C.CHUNK_HANDS, input.hands - played);
    const k = n / 100;
    const wr = wrNow();
    const z = rng.normal();
    const chunkNet = wr.netWR * k + C.STDDEV_BB100 * Math.sqrt(k) * z;
    const nsdMean = C.NSD_BASE + C.NSD_EDGE_FACTOR * wr.edge;
    const chunkNsd = sampleHands(rng, n, nsdMean, C.NSD_STDDEV_BB100);
    played += n;
    net += chunkNet;
    nsd += chunkNsd;
    wrSum += wr.netWR * n;

    // Bad beats, coolers y hero calls: los tramos extremos de la varianza
    if (z <= C.BAD_BEAT_Z) {
      const cooler = rng.next() < 0.5;
      const d = addTilt(C.BAD_BEAT_TILT);
      events.push({
        hand: played,
        kind: cooler ? 'cooler' : 'badbeat',
        text: (cooler ? 'Cooler: ' : 'Bad beat: ') + pick(rng, cooler ? COOLERS : BAD_BEATS),
        tiltDelta: d,
      });
    } else if (z >= C.HERO_CALL_Z) {
      const d = addTilt(-C.HERO_CALL_TILT_RELIEF);
      events.push({ hand: played, kind: 'herocall', text: pick(rng, HERO_CALLS), tiltDelta: d });
    }

    // Tilt por nuevos mínimos / máximos de la sesión
    if (net < sessionLow) {
      addTilt(((sessionLow - net) / C.BUYIN_BB) * C.TILT_PER_BUYIN_NEW_LOW);
      sessionLow = net;
    } else if (net > sessionHigh) {
      addTilt((-(net - sessionHigh) / C.BUYIN_BB) * C.TILT_RELIEF_PER_BUYIN_NEW_HIGH);
      sessionHigh = net;
    }

    // Downswing de la carrera en buy-ins
    ds.cumBI += chunkNet / C.BUYIN_BB;
    if (ds.cumBI > ds.peakBI) {
      ds.peakBI = ds.cumBI;
      ds.announced = 0;
    }
    const dd = ds.peakBI - ds.cumBI;
    maxDD = Math.max(maxDD, dd);
    while (ds.announced < C.DOWNSWING_EVENTS.length && dd >= C.DOWNSWING_EVENTS[ds.announced].buyins) {
      const ev = C.DOWNSWING_EVENTS[ds.announced];
      const d = addTilt(ev.tilt);
      events.push({
        hand: played,
        kind: 'downswing',
        text: `Downswing de ${ev.buyins} buy-ins. ${ev.buyins >= 20 ? 'Esto es póker… respira.' : 'Mantén la calma.'}`,
        tiltDelta: d,
      });
      ds.announced++;
    }

    energy = Math.max(0, energy - input.energyPerHand * n);
    curveEur.push(net * lim.bb);
    cumTrace.push(net);
    full.push([played, net, net - nsd]);

    if (played >= input.hands) break;
    if (input.bankroll + net * lim.bb < buyin) {
      stopReason = 'bankroll';
      break;
    }
    if (energy <= C.EXHAUSTION_ENERGY) {
      stopReason = 'energia';
      events.push({
        hand: played,
        kind: 'exhausted',
        text: 'Te quedas dormido delante de las mesas y cortas la sesión.',
        tiltDelta: 0,
      });
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
    cumTrace,
    stoppedEarly: !!stopReason,
    stopReason,
    events,
    startWR,
    avgWR: played > 0 ? wrSum / played : startWR,
    endTilt: tilt,
    endEnergy: energy,
    downswing: ds,
    maxDownswingBI: maxDD,
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

export function handsFor(tables: number, hours: number, handsMult = 1): number {
  return Math.round(C.HANDS_PER_HOUR_PER_TABLE * tables * hours * handsMult);
}

/** Energía que cuesta jugar: más mesas cansan más y cada hora por encima de 40 h/semana cansa un 50 % más */
export function playEnergyCost(tables: number, hours: number, costMult = 1): number {
  const perHour = (C.PLAY_ENERGY_PER_HOUR_BASE + C.PLAY_ENERGY_PER_HOUR_PER_TABLE * tables) * costMult;
  const normal = Math.min(hours, C.LONG_WEEK_HOURS);
  const extra = Math.max(0, hours - C.LONG_WEEK_HOURS);
  return perHour * (normal + extra * C.LONG_WEEK_ENERGY_MULT);
}

export type LimitRating = 'favorable' | 'ajustado' | 'desfavorable';

export function rateWinrate(wr: number): LimitRating {
  if (wr >= 3) return 'favorable';
  if (wr >= -2) return 'ajustado';
  return 'desfavorable';
}
