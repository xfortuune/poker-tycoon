import * as C from './config';
import { Rng } from './rng';
import {
  buyinEur,
  buyinsFor,
  expectedWinrate,
  getLimit,
  handsFor,
  limitIndex,
  playEnergyCost,
  simulateSession,
  vipLevelFor,
} from './simulation';
import { applySkillDelta, clampSkill, playXp, SKILL_IDS, studyGain } from './skills';
import { clamp } from './state';
import type {
  GameState,
  LimitStats,
  PlayOutcome,
  Skills,
  WeekAction,
  WeekResult,
} from './types';

const fmtEur = (v: number) => `${v.toFixed(2).replace('.', ',')} €`;

function emptyLimitStats(): LimitStats {
  return { hands: 0, netBB: 0, sdBB: 0, nsdBB: 0, netEur: 0, rakeEur: 0, cumBB: 0, peakBB: 0, maxDownswingBB: 0 };
}

function tiltDecay(mental: number): number {
  return C.TILT_DECAY_BASE + mental / C.TILT_DECAY_MENTAL_DIVISOR;
}

function pushRake(history: number[], rake: number): number[] {
  return [...history, rake].slice(-C.VIP_WINDOW_WEEKS);
}

/** Comprueba si una acción es válida en el estado actual. Devuelve el motivo si no lo es. */
export function validateAction(state: GameState, action: WeekAction): string | null {
  if (action.type === 'play') {
    if (action.tables < C.MIN_TABLES || action.tables > C.MAX_TABLES) return 'Número de mesas no válido';
    if (action.hours < C.MIN_PLAY_HOURS || action.hours > C.MAX_WEEK_HOURS) return 'Horas no válidas';
    if (state.bankroll < buyinEur(action.limit)) return `Necesitas al menos un buy-in (${fmtEur(buyinEur(action.limit))})`;
  }
  if (action.type === 'study') {
    if (action.hours < C.MIN_STUDY_HOURS || action.hours > C.MAX_STUDY_HOURS) return 'Horas no válidas';
  }
  return null;
}

/**
 * Avanza una semana aplicando la acción elegida. Función pura:
 * no modifica `state` y devuelve el nuevo estado dentro del resultado.
 */
export function runWeek(state: GameState, action: WeekAction): WeekResult {
  const invalid = validateAction(state, action);
  if (invalid) throw new Error(invalid);

  const rng = new Rng(state.rng);
  const messages: string[] = [];
  let s: GameState = {
    ...state,
    skills: { ...state.skills },
    limitStats: { ...state.limitStats },
    career: { ...state.career },
  };
  let play: PlayOutcome | undefined;
  const skillDelta: Partial<Skills> = {};

  if (action.type === 'play') {
    const lim = getLimit(action.limit);
    const hands = handsFor(action.tables, action.hours);
    const energyCost = playEnergyCost(action.tables, action.hours);
    const avgEnergy = Math.max(0, s.energy - energyCost / 2);
    const wr = expectedWinrate({
      skills: s.skills,
      limit: action.limit,
      tables: action.tables,
      energy: avgEnergy,
      tilt: s.tilt,
    });

    const bis = buyinsFor(s.bankroll, action.limit);
    if (bis < C.RECOMMENDED_BUYINS) {
      messages.push(`Has jugado ${action.limit} con solo ${Math.floor(bis)} buy-ins (recomendado: ${C.RECOMMENDED_BUYINS}).`);
    }

    const sim = simulateSession(rng, {
      limit: action.limit,
      hands,
      netWR: wr.netWR,
      edge: wr.edge,
      bankroll: s.bankroll,
    });
    if (sim.stoppedEarly) {
      messages.push(`Te has quedado sin buy-ins para ${action.limit} y has cortado la sesión.`);
    }

    const netEur = sim.netBB * lim.bb;
    const rakeEur = sim.rakeBB * lim.bb;
    s.rakeHistory = pushRake(s.rakeHistory, rakeEur);
    const vip = vipLevelFor(s.rakeHistory.reduce((a, b) => a + b, 0));
    const rakebackEur = rakeEur * vip.rakeback;
    s.bankroll += netEur + rakebackEur;

    // Estadísticas del límite (downswing medido tramo a tramo)
    const ls = { ...(s.limitStats[action.limit] ?? emptyLimitStats()) };
    const baseBB = ls.cumBB;
    for (const cum of sim.cumTrace) {
      const v = baseBB + cum;
      ls.peakBB = Math.max(ls.peakBB, v);
      ls.maxDownswingBB = Math.max(ls.maxDownswingBB, ls.peakBB - v);
    }
    ls.cumBB = baseBB + sim.netBB;
    ls.hands += sim.hands;
    ls.netBB += sim.netBB;
    ls.sdBB += sim.sdBB;
    ls.nsdBB += sim.nsdBB;
    ls.netEur += netEur;
    ls.rakeEur += rakeEur;
    s.limitStats[action.limit] = ls;

    // Carrera (downswing global en €)
    const c = s.career;
    const baseEur = c.cumEur;
    for (const cum of sim.curveEur) {
      const v = baseEur + cum;
      c.peakEur = Math.max(c.peakEur, v);
      c.maxDownswingEur = Math.max(c.maxDownswingEur, c.peakEur - v);
    }
    c.cumEur = baseEur + netEur;
    c.hands += sim.hands;
    c.netEur += netEur;
    c.rakeEur += rakeEur;
    c.rakebackEur += rakebackEur;
    c.maxLimitIndex = Math.max(c.maxLimitIndex, limitIndex(action.limit));
    c.weeksPlayed += 1;

    s.sessions = [
      ...s.sessions,
      {
        week: s.week,
        limit: action.limit,
        tables: action.tables,
        hours: action.hours,
        hands: sim.hands,
        netBB: round1(sim.netBB),
        sdBB: round1(sim.sdBB),
        nsdBB: round1(sim.nsdBB),
        netEur: round2(netEur),
        rakeEur: round2(rakeEur),
        rakebackEur: round2(rakebackEur),
        curve: sim.curve,
      },
    ];

    // Experiencia
    Object.assign(skillDelta, playXp(s.skills, sim.hands));

    // Energía: se gasta en proporción a lo realmente jugado
    const playedFraction = hands > 0 ? sim.hands / hands : 0;
    s.energy = clamp(s.energy - energyCost * playedFraction + C.WEEKLY_ENERGY_RECOVERY, 0, 100);

    // Tilt según el resultado en buy-ins
    const resultBI = sim.netBB / C.BUYIN_BB;
    const tiltChange =
      resultBI < 0
        ? -resultBI * C.TILT_PER_BUYIN_LOST * (1 - s.skills.mental / 200)
        : -resultBI * C.TILT_RELIEF_PER_BUYIN_WON;
    s.tilt = clamp(s.tilt + tiltChange - tiltDecay(s.skills.mental), 0, 100);

    play = {
      limit: action.limit,
      tables: action.tables,
      hoursPlanned: action.hours,
      hands: sim.hands,
      netBB: sim.netBB,
      sdBB: sim.sdBB,
      nsdBB: sim.nsdBB,
      netEur,
      rakeEur,
      rakebackEur,
      vipLevel: vip.name,
      rakebackRate: vip.rakeback,
      expectedWR: wr.netWR,
      curveEur: sim.curveEur,
      stoppedEarly: sim.stoppedEarly,
    };
  } else if (action.type === 'study') {
    skillDelta[action.topic] = studyGain(s.skills[action.topic], action.hours);
    s.energy = clamp(s.energy - C.STUDY_ENERGY_PER_HOUR * action.hours + C.WEEKLY_ENERGY_RECOVERY, 0, 100);
    s.tilt = clamp(s.tilt - tiltDecay(s.skills.mental), 0, 100);
    s.rakeHistory = pushRake(s.rakeHistory, 0);
    s.career.weeksStudied += 1;
  } else {
    s.energy = clamp(s.energy + C.REST_ENERGY, 0, 100);
    s.tilt = clamp(s.tilt - C.REST_TILT - tiltDecay(s.skills.mental), 0, 100);
    s.rakeHistory = pushRake(s.rakeHistory, 0);
    s.career.weeksRested += 1;
  }

  s.skills = applySkillDelta(s.skills, skillDelta);

  // Bancarrota: sin dinero para un buy-in del límite más bajo
  let busted = false;
  if (s.bankroll < buyinEur(C.LIMITS[0].id)) {
    busted = true;
    const kept: Skills = { ...s.skills };
    for (const id of SKILL_IDS) kept[id] = clampSkill(s.skills[id] * C.BUST_SKILL_RETENTION);
    s = {
      ...s,
      bankroll: C.START_BANKROLL,
      skills: kept,
      energy: 100,
      tilt: 0,
      rakeHistory: [],
      career: { ...s.career, busts: s.career.busts + 1 },
    };
    messages.push(`¡Bancarrota! Vuelves a empezar con ${fmtEur(C.START_BANKROLL)} y conservas el ${Math.round(C.BUST_SKILL_RETENTION * 100)} % de tus habilidades.`);
  }

  s.week += 1;
  s.rng = rng.state;

  return {
    action,
    before: state,
    after: s,
    play,
    skillDelta: Object.fromEntries(SKILL_IDS.map((id) => [id, s.skills[id] - state.skills[id]])) as Skills,
    energyDelta: s.energy - state.energy,
    tiltDelta: s.tilt - state.tilt,
    bankrollDelta: s.bankroll - state.bankroll,
    busted,
    messages,
  };
}

/** Sugerencia de cambio de límite según bankroll (30 BI) */
export function suggestLimit(state: GameState): { up?: string; down?: string } {
  const idx = state.sessions.length ? limitIndex(state.sessions[state.sessions.length - 1].limit) : 0;
  const cur = C.LIMITS[idx];
  const next = C.LIMITS[idx + 1];
  const out: { up?: string; down?: string } = {};
  if (buyinsFor(state.bankroll, cur.id) < C.RECOMMENDED_BUYINS * 0.66 && idx > 0) {
    out.down = `Tu bankroll es justo para ${cur.id}. Plantéate bajar a ${C.LIMITS[idx - 1].id}.`;
  } else if (next && buyinsFor(state.bankroll, next.id) >= C.RECOMMENDED_BUYINS) {
    out.up = `Tienes ${C.RECOMMENDED_BUYINS}+ buy-ins para ${next.id}. ¿Pruebas a subir?`;
  }
  return out;
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}
function round2(v: number) {
  return Math.round(v * 100) / 100;
}
