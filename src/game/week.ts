import * as C from './config';
import { applyCoachWeek, coachMissing, coachUnlocked } from './coaching';
import { Rng } from './rng';
import { applySchoolWeek } from './school';
import { applyIdleStreamWeek, applyStreamWeek, computeFame, streamMissing } from './streaming';
import {
  getHome,
  isMonthEnd,
  monthlyExpenses,
  setupEffects,
  weeklyRecovery,
} from './setup';
import {
  buyinEur,
  buyinsFor,
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
  CoachOutcome,
  ExpensesBreakdown,
  SchoolOutcome,
  StreamOutcome,
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

/** Bajada natural del tilt cada semana */
export function tiltDecay(state: Pick<GameState, 'skills' | 'moral'>): number {
  return Math.max(
    0,
    C.TILT_DECAY_BASE + state.skills.mental / C.TILT_DECAY_MENTAL_DIVISOR + (state.moral - 50) / C.MORAL_TILT_DIVISOR,
  );
}

function pushRake(history: number[], rake: number): number[] {
  return [...history, rake].slice(-C.VIP_WINDOW_WEEKS);
}

export function isExhausted(state: GameState): boolean {
  return state.energy < C.EXHAUSTED_THRESHOLD;
}

/** Horas máximas que puedes dedicar esta semana a jugar o estudiar */
export function maxHoursThisWeek(state: GameState, kind: 'play' | 'study'): number {
  const max = kind === 'play' ? C.MAX_WEEK_HOURS : C.MAX_STUDY_HOURS;
  return isExhausted(state) ? Math.min(max, C.EXHAUSTED_MAX_HOURS) : max;
}

/** Comprueba si una acción es válida en el estado actual. Devuelve el motivo si no lo es. */
export function validateAction(state: GameState, action: WeekAction): string | null {
  if (action.type === 'stream') {
    const missing = streamMissing(state);
    if (missing.length) return `Para emitir te falta: ${missing.join(', ')}`;
  }
  if (action.type === 'coach') {
    if (!coachUnlocked(state)) return `Para dar clases te falta: ${coachMissing(state).join(', ')}`;
    const max = maxHoursThisWeek(state, 'study');
    if (action.hours < Math.min(C.MIN_COACH_HOURS, max) || action.hours > Math.min(C.MAX_COACH_HOURS, max)) {
      return isExhausted(state) ? `Estás agotado: como mucho ${C.EXHAUSTED_MAX_HOURS} h esta semana` : 'Horas no válidas';
    }
  }
  if (action.type === 'play' || action.type === 'stream') {
    const fx = setupEffects(state.setup);
    if (action.tables < C.MIN_TABLES || action.tables > fx.maxTables) {
      return `Tu ordenador solo aguanta ${fx.maxTables} mesas`;
    }
    if (action.hours < C.MIN_PLAY_HOURS || action.hours > maxHoursThisWeek(state, 'play')) {
      return isExhausted(state) ? `Estás agotado: como mucho ${C.EXHAUSTED_MAX_HOURS} h esta semana` : 'Horas no válidas';
    }
    if (state.bankroll < buyinEur(action.limit)) return `Necesitas al menos un buy-in (${fmtEur(buyinEur(action.limit))})`;
  }
  if (action.type === 'study') {
    const max = maxHoursThisWeek(state, 'study');
    const min = Math.min(C.MIN_STUDY_HOURS, max);
    if (action.hours < min || action.hours > max) {
      return isExhausted(state) ? `Estás agotado: como mucho ${C.EXHAUSTED_MAX_HOURS} h esta semana` : 'Horas no válidas';
    }
  }
  return null;
}

/** Ganancia de estudio con el software y la moral actuales */
export function studyGainFor(state: GameState, topic: keyof Skills, hours: number): number {
  const fx = setupEffects(state.setup);
  const moralMult = state.moral < C.MORAL_LOW_STUDY ? C.MORAL_LOW_STUDY_MULT : 1;
  return studyGain(state.skills[topic], hours) * fx.studyMult * moralMult;
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
  const fx = setupEffects(state.setup);
  const recovery = weeklyRecovery(state);
  let s: GameState = {
    ...state,
    skills: { ...state.skills },
    limitStats: { ...state.limitStats },
    career: { ...state.career },
    downswing: { ...state.downswing },
  };
  let play: PlayOutcome | undefined;
  let stream: StreamOutcome | undefined;
  let coach: CoachOutcome | undefined;
  const skillDelta: Partial<Skills> = {};
  let moralChange = 0;

  if (action.type === 'play' || action.type === 'stream') {
    const live = action.type === 'stream';
    const lim = getLimit(action.limit);
    const hands = handsFor(action.tables, action.hours, fx.handsMult);
    const energyCost =
      playEnergyCost(action.tables, action.hours, fx.energyCostMult) * (live ? C.STREAM_ENERGY_MULT : 1);

    const bis = buyinsFor(s.bankroll, action.limit);
    if (bis < C.RECOMMENDED_BUYINS) {
      messages.push(`Has jugado ${action.limit} con solo ${Math.floor(bis)} buy-ins (recomendado: ${C.RECOMMENDED_BUYINS}).`);
    }

    const sim = simulateSession(rng, {
      limit: action.limit,
      hands,
      bankroll: s.bankroll,
      skills: s.skills,
      tables: action.tables,
      comfortTables: fx.comfortTables,
      skillBonus: fx.skillBonus - (live ? C.STREAM_SKILL_PENALTY : 0),
      energy: s.energy,
      energyPerHand: hands > 0 ? energyCost / hands : 0,
      tilt: s.tilt,
      downswing: s.downswing,
    });
    if (sim.stopReason === 'bankroll') {
      messages.push(`Te has quedado sin buy-ins para ${action.limit} y has cortado la sesión.`);
    } else if (sim.stopReason === 'energia') {
      messages.push('Te has quedado sin energía y has cortado la sesión. Descansa.');
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

    // Carrera (downswing global en € y en buy-ins)
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
    if (live) c.weeksStreamed += 1;
    c.maxDownswingBI = Math.max(c.maxDownswingBI, sim.maxDownswingBI);
    c.badBeats += sim.events.filter((e) => e.kind === 'badbeat' || e.kind === 'cooler').length;
    s.downswing = sim.downswing;

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
        ...(live ? { streamed: true } : {}),
      },
    ];

    Object.assign(skillDelta, playXp(s.skills, sim.hands));

    s.energy = clamp(sim.endEnergy + recovery, 0, 100);
    s.tilt = clamp(sim.endTilt - tiltDecay(s), 0, 100);
    moralChange = clamp((sim.netBB / C.BUYIN_BB) * C.MORAL_PER_BUYIN, -C.MORAL_WEEK_MAX_LOSS, C.MORAL_WEEK_MAX_GAIN);

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
      expectedWR: sim.startWR,
      avgWR: sim.avgWR,
      curveEur: sim.curveEur,
      stoppedEarly: sim.stoppedEarly,
      stopReason: sim.stopReason,
      events: sim.events,
    };
    if (live) {
      stream = applyStreamWeek(s, rng, action.hours, play, hands);
      if (stream.viral) messages.push(`🔥 ${stream.viral} (+${stream.viralFollowers} seguidores)`);
    }
  } else if (action.type === 'coach') {
    const r = applyCoachWeek(s, action.hours);
    coach = r.outcome;
    Object.assign(skillDelta, r.xp);
    s.energy = clamp(s.energy - C.COACH_ENERGY_PER_HOUR * action.hours + recovery, 0, 100);
    s.tilt = clamp(s.tilt - tiltDecay(s), 0, 100);
    s.rakeHistory = pushRake(s.rakeHistory, 0);
    s.career.weeksCoached += 1;
    if (coach.hoursSold < action.hours) {
      messages.push(`Solo había alumnos para ${coach.hoursSold} h de clase esta semana.`);
    }
  } else if (action.type === 'study') {
    skillDelta[action.topic] = studyGainFor(s, action.topic, action.hours);
    s.energy = clamp(s.energy - C.STUDY_ENERGY_PER_HOUR * action.hours + recovery, 0, 100);
    s.tilt = clamp(s.tilt - tiltDecay(s), 0, 100);
    s.rakeHistory = pushRake(s.rakeHistory, 0);
    s.career.weeksStudied += 1;
  } else {
    // Descansar: recuperas lo de una semana de descanso más los extras de vivienda, silla y moral
    s.energy = clamp(s.energy + C.REST_ENERGY + (recovery - C.WEEKLY_ENERGY_RECOVERY), 0, 100);
    s.tilt = clamp(s.tilt - C.REST_TILT - tiltDecay(s), 0, 100);
    s.rakeHistory = pushRake(s.rakeHistory, 0);
    s.career.weeksRested += 1;
    moralChange = C.MORAL_REST_BONUS;
  }

  s.skills = applySkillDelta(s.skills, skillDelta);

  // Seguidores y subs si esta semana no has emitido; ingresos pasivos de la escuela
  if (action.type !== 'stream') stream = applyIdleStreamWeek(s);
  const monthEnd = isMonthEnd(state.week);
  const school: SchoolOutcome | undefined = applySchoolWeek(s, rng, monthEnd);

  // Moral: resultado de la semana y tendencia hacia la moral base de tu vivienda
  const base = getHome(s.home).moral;
  let moral = clamp(s.moral + moralChange, 0, 100);
  moral += (base - moral) * C.MORAL_DRIFT;
  s.moral = clamp(moral, 0, 100);

  // Gastos fijos al cerrar el mes
  let expenses: ExpensesBreakdown | undefined;
  if (monthEnd) {
    expenses = monthlyExpenses(s);
    s.bankroll -= expenses.total;
    s.career.expensesEur += expenses.total;
    if (expenses.total > 0) messages.push(`Fin de mes: has pagado ${fmtEur(expenses.total)} de gastos fijos.`);
  }

  // Bancarrota: sin dinero para un buy-in del límite más bajo
  let busted = false;
  if (s.bankroll < buyinEur(C.LIMITS[0].id)) {
    busted = true;
    const kept: Skills = { ...s.skills };
    for (const id of SKILL_IDS) kept[id] = bustSkill(s.skills[id]);
    const wasHome = s.home;
    s = {
      ...s,
      bankroll: C.START_BANKROLL,
      skills: kept,
      energy: 100,
      tilt: 0,
      moral: C.MORAL_AFTER_BUST,
      home: 'habitacion',
      rakeHistory: [],
      downswing: { cumBI: 0, peakBI: 0, announced: 0 },
      // Sin dinero para pagar sueldos, los coaches de la escuela se marchan
      school: { ...s.school, coaches: [] },
      career: { ...s.career, busts: s.career.busts + 1 },
    };
    messages.push(
      `¡Bancarrota! Vuelves a empezar con ${fmtEur(C.START_BANKROLL)} y conservas el ${Math.round(C.BUST_SKILL_RETENTION * 100)} % de lo que habías aprendido.` +
        (wasHome !== 'habitacion' ? ' Has tenido que volver a casa de tus padres.' : ''),
    );
  } else {
    const nextMonth = monthlyExpenses(s).total;
    if (nextMonth > 0 && s.bankroll < nextMonth * 2) {
      messages.push(`Cuidado: tus gastos son ${fmtEur(nextMonth)} al mes y tu bankroll apenas los cubre.`);
    }
  }

  s.fame = computeFame(s);
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
    moralDelta: s.moral - state.moral,
    stream,
    coach,
    school,
    fameDelta: s.fame - state.fame,
    expenses,
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

/** Al arruinarte pierdes parte de lo aprendido, pero nunca bajas del nivel inicial */
export function bustSkill(v: number): number {
  if (v <= C.START_SKILL) return v;
  return clampSkill(C.START_SKILL + (v - C.START_SKILL) * C.BUST_SKILL_RETENTION);
}
