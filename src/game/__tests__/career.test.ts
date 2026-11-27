import { describe, expect, it } from 'vitest';
import * as C from '../config';
import { coachDemand, coachRate, coachUnlocked } from '../coaching';
import { deserialize } from '../save';
import { createCourse, courseNovelty, fireCoach, hireCoach, openSchool, schoolMissing, targetMembers } from '../school';
import { buyUpgrade, monthlyExpenses } from '../setup';
import { newGame } from '../state';
import { buyGear, computeFame, expectedViewers, streamMissing } from '../streaming';
import type { GameState, WeekAction } from '../types';
import { runWeek, validateAction } from '../week';

/** Jugador de NL25 con equipo para emitir */
function streamer(): GameState {
  let g: GameState = {
    ...newGame(11),
    bankroll: 5000,
    skills: { preflop: 50, postflop: 50, lectura: 50, mental: 50 },
    career: { ...newGame(11).career, maxLimitIndex: 3 },
  };
  g = buyGear(buyGear(g, 'micro'), 'camara');
  g = buyUpgrade(g, 'monitores');
  return { ...g, fame: computeFame(g) };
}

function coachReady(): GameState {
  const g = { ...streamer(), followers: 2000, career: { ...streamer().career, maxLimitIndex: 4 } };
  return { ...g, fame: computeFame(g) };
}

const STREAM: WeekAction = { type: 'stream', limit: 'NL25', tables: 2, hours: 20 };

describe('fama', () => {
  it('sube con los seguidores y con el límite máximo', () => {
    const g = newGame(1);
    const base = computeFame(g);
    expect(computeFame({ ...g, followers: 1000 })).toBeGreaterThan(base);
    expect(computeFame({ ...g, career: { ...g.career, maxLimitIndex: 5 } })).toBeGreaterThan(base);
    expect(computeFame({ ...g, followers: 1e9, career: { ...g.career, maxLimitIndex: 9 } })).toBeLessThanOrEqual(100);
  });
});

describe('streaming', () => {
  it('necesitas NL25 o fama, micro, cámara y segundo monitor', () => {
    expect(streamMissing(newGame(1)).length).toBe(4);
    expect(streamMissing(streamer())).toEqual([]);
    expect(validateAction(newGame(1), STREAM)).toMatch(/emitir/);
  });

  it('emitir da seguidores e ingresos y la sesión cuenta como jugada', () => {
    const g = streamer();
    const r = runWeek(g, STREAM);
    expect(r.stream).toBeDefined();
    expect(r.stream!.newFollowers).toBeGreaterThan(0);
    expect(r.after.followers).toBeGreaterThan(0);
    expect(r.stream!.totalEur).toBeGreaterThan(0);
    expect(r.after.sessions.at(-1)!.streamed).toBe(true);
    expect(r.after.career.weeksStreamed).toBe(1);
  });

  it('streamear baja el winrate y cansa más que jugar', () => {
    const g = streamer();
    const play = runWeek(g, { ...STREAM, type: 'play' });
    const live = runWeek(g, STREAM);
    expect(live.play!.expectedWR).toBeLessThan(play.play!.expectedWR);
    expect(live.after.energy).toBeLessThan(play.after.energy);
  });

  it('más seguidores y mejor equipo dan más espectadores', () => {
    const g = streamer();
    expect(expectedViewers(10_000, g.stream.gear, 'NL25')).toBeGreaterThan(expectedViewers(100, g.stream.gear, 'NL25'));
    const better = buyGear(buyGear({ ...g, bankroll: 5000 }, 'micro'), 'luz');
    expect(expectedViewers(1000, better.stream.gear, 'NL25')).toBeGreaterThan(expectedViewers(1000, g.stream.gear, 'NL25'));
  });

  it('los seguidores crecen a lo largo de un año emitiendo', () => {
    let g = streamer();
    for (let w = 0; w < 52; w++) {
      const a: WeekAction = g.energy < 40 ? { type: 'rest' } : STREAM;
      g = runWeek(g, a).after;
    }
    expect(g.followers).toBeGreaterThan(1000);
    expect(g.stream.subs).toBeGreaterThan(5);
  });

  it('si dejas de emitir pierdes seguidores y subs', () => {
    let g = { ...streamer(), followers: 10_000 };
    g = runWeek(g, STREAM).after;
    const subs = g.stream.subs;
    const followers = g.followers;
    for (let w = 0; w < 6; w++) g = runWeek(g, { type: 'rest' }).after;
    expect(g.followers).toBeLessThan(followers);
    expect(g.stream.subs).toBeLessThan(subs);
  });

  it('los momentos épicos pueden hacerse virales', () => {
    let virals = 0;
    for (let seed = 0; seed < 60; seed++) {
      const g = { ...streamer(), rng: seed };
      if (runWeek(g, { ...STREAM, tables: 4, hours: 40 }).stream!.viral) virals++;
    }
    expect(virals).toBeGreaterThan(0);
  });
});

describe('coaching', () => {
  it('se desbloquea con NL50 y fama', () => {
    expect(coachUnlocked(streamer())).toBe(false);
    expect(coachUnlocked(coachReady())).toBe(true);
  });

  it('cobras por las horas que te piden y ganas reputación', () => {
    const g = coachReady();
    const r = runWeek(g, { type: 'coach', hours: 40 });
    expect(r.coach!.hoursSold).toBe(Math.min(40, coachDemand(g)));
    expect(r.coach!.incomeEur).toBeCloseTo(r.coach!.hoursSold * coachRate(g), 6);
    expect(r.after.coaching.reputation).toBeGreaterThan(0);
    expect(r.after.bankroll).toBeGreaterThan(g.bankroll);
  });

  it('la tarifa sube con el límite máximo', () => {
    const g = coachReady();
    expect(coachRate({ ...g, career: { ...g.career, maxLimitIndex: 8 } })).toBeGreaterThan(coachRate(g) * 2);
  });
});

describe('escuela', () => {
  function schoolReady(): GameState {
    const g = coachReady();
    return openSchool({ ...g, bankroll: 100_000, fame: 50, coaching: { ...g.coaching, reputation: 50 } });
  }

  it('hace falta reputación, fama y dinero para abrirla', () => {
    expect(schoolMissing(coachReady()).length).toBeGreaterThan(0);
    const g = schoolReady();
    expect(g.school.open).toBe(true);
    expect(g.bankroll).toBe(100_000 - C.SCHOOL_OPEN_COST);
    expect(g.school.candidates).toHaveLength(C.SCHOOL_CANDIDATES);
  });

  it('contratar coaches sube los miembros objetivo y los gastos', () => {
    const g = schoolReady();
    const before = targetMembers(g);
    const h = hireCoach(g, g.school.candidates[0].id);
    expect(h.school.coaches).toHaveLength(1);
    expect(targetMembers(h)).toBeGreaterThan(before);
    expect(monthlyExpenses(h).school).toBe(C.SCHOOL_PLATFORM_MONTHLY + h.school.coaches[0].salary);
    expect(fireCoach(h, h.school.coaches[0].id).school.coaches).toHaveLength(0);
  });

  it('los cursos dan ingresos pasivos que bajan con el tiempo', () => {
    let g = createCourse(schoolReady(), 'postflop');
    expect(g.school.courses).toHaveLength(1);
    const c = g.school.courses[0];
    expect(courseNovelty(c, c.createdWeek + 52)).toBeLessThan(courseNovelty(c, c.createdWeek));
    let income = 0;
    for (let w = 0; w < 8; w++) {
      const r = runWeek(g, { type: 'rest' });
      income += r.school!.totalEur;
      g = r.after;
    }
    expect(income).toBeGreaterThan(0);
    expect(g.school.courses[0].sales).toBeGreaterThan(0);
    expect(g.school.members).toBeGreaterThan(0);
  });
});

describe('migración v2 → v3', () => {
  it('añade streaming, coaching y escuela y calcula la fama', () => {
    const v2 = { ...newGame(3), career: { ...newGame(3).career, maxLimitIndex: 3 } } as Partial<GameState>;
    delete v2.stream;
    delete v2.coaching;
    delete v2.school;
    const json = JSON.stringify({ game: 'poker-tycoon', version: 2, savedAt: 1, state: { ...v2, version: 2 } });
    const { state } = deserialize(json);
    expect(state.stream.gear).toEqual({ micro: 0, camara: 0, luz: 0 });
    expect(state.school.open).toBe(false);
    expect(state.fame).toBeGreaterThanOrEqual(C.STREAM_UNLOCK_FAME);
  });
});
