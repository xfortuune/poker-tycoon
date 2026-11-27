import { describe, expect, it } from 'vitest';
import * as C from '../config';
import { calendar, newGame } from '../state';
import type { WeekAction } from '../types';
import { runWeek, validateAction } from '../week';

describe('runWeek', () => {
  it('jugar suma manos, cambia el bankroll y gasta energía', () => {
    const g = newGame(1);
    const r = runWeek(g, { type: 'play', limit: 'NL2', tables: 2, hours: 20 });
    expect(r.play!.hands).toBe(C.HANDS_PER_HOUR_PER_TABLE * 2 * 20);
    expect(r.after.bankroll).toBeCloseTo(g.bankroll + r.play!.netEur + r.play!.rakebackEur, 6);
    expect(r.after.energy).toBeLessThan(g.energy);
    expect(r.after.week).toBe(1);
    expect(r.after.sessions).toHaveLength(1);
    expect(r.play!.rakebackEur).toBeCloseTo(r.play!.rakeEur * 0.1, 6);
    expect(g.sessions).toHaveLength(0); // no muta el estado original
  });

  it('es determinista con la misma semilla', () => {
    const a = runWeek(newGame(5), { type: 'play', limit: 'NL2', tables: 4, hours: 30 });
    const b = runWeek(newGame(5), { type: 'play', limit: 'NL2', tables: 4, hours: 30 });
    expect(a.after.bankroll).toBe(b.after.bankroll);
  });

  it('estudiar sube la habilidad con rendimientos decrecientes', () => {
    const g = newGame(1);
    const r1 = runWeek(g, { type: 'study', topic: 'postflop', hours: 40 });
    expect(r1.after.skills.postflop).toBeCloseTo(25 + 6 * 0.75, 6);
    const high = { ...g, skills: { ...g.skills, postflop: 90 } };
    const r2 = runWeek(high, { type: 'study', topic: 'postflop', hours: 40 });
    expect(r2.after.skills.postflop - 90).toBeLessThan(r1.after.skills.postflop - 25);
  });

  it('descansar recupera energía y baja el tilt', () => {
    const g = { ...newGame(1), energy: 20, tilt: 60, moral: 50 };
    const r = runWeek(g, { type: 'rest' });
    expect(r.after.energy).toBe(80);
    expect(r.after.tilt).toBeLessThan(30);
  });

  it('la bancarrota reinicia el bankroll y conserva parte de las habilidades', () => {
    const g = { ...newGame(3), bankroll: 1, skills: { preflop: 50, postflop: 50, lectura: 50, mental: 50 } };
    const r = runWeek(g, { type: 'rest' });
    expect(r.busted).toBe(true);
    expect(r.after.bankroll).toBe(C.START_BANKROLL);
    expect(r.after.career.busts).toBe(1);
    expect(r.after.skills.preflop).toBeCloseTo(25 + 25 * 0.7, 6);
  });

  it('no deja jugar sin un buy-in', () => {
    const g = newGame(1);
    expect(validateAction(g, { type: 'play', limit: 'NL100', tables: 1, hours: 10 })).not.toBeNull();
    expect(() => runWeek(g, { type: 'play', limit: 'NL100', tables: 1, hours: 10 })).toThrow();
  });

  it('el calendario avanza por semanas y años', () => {
    expect(calendar(0)).toEqual({ week: 1, year: 1 });
    expect(calendar(52)).toEqual({ week: 1, year: 2 });
  });

  it('con 30 buy-ins un jugador ganador rara vez se arruina en un año (incluidos los gastos)', () => {
    let busts = 0;
    for (let seed = 0; seed < 40; seed++) {
      let g = { ...newGame(seed), bankroll: 60, skills: { preflop: 40, postflop: 40, lectura: 40, mental: 40 } };
      for (let w = 0; w < 52; w++) {
        const action: WeekAction =
          g.energy < 40 ? { type: 'rest' } : { type: 'play', limit: 'NL2', tables: 2, hours: 25 };
        const r = runWeek(g, action);
        if (r.busted) {
          busts++;
          break;
        }
        g = r.after;
      }
    }
    expect(busts).toBeLessThan(4);
  });
});
