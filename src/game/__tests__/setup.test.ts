import { describe, expect, it } from 'vitest';
import * as C from '../config';
import { deserialize } from '../save';
import {
  buyUpgrade,
  canMove,
  isMonthEnd,
  monthlyExpenses,
  moveHome,
  setupEffects,
  weeklyRecovery,
} from '../setup';
import { newGame } from '../state';
import type { GameState } from '../types';
import { runWeek, studyGainFor, validateAction } from '../week';

const rich = (): GameState => ({ ...newGame(1), bankroll: 20_000 });

describe('setup', () => {
  it('el setup inicial: 2 mesas cómodas y 4 como máximo', () => {
    const fx = setupEffects(newGame(1).setup);
    expect(fx.comfortTables).toBe(2);
    expect(fx.maxTables).toBe(4);
  });

  it('comprar mejoras cuesta dinero y mejora los efectos', () => {
    let g = rich();
    g = buyUpgrade(g, 'monitores');
    g = buyUpgrade(g, 'pc');
    expect(g.bankroll).toBe(20_000 - 150 - 600);
    expect(g.career.spentEur).toBe(750);
    const fx = setupEffects(g.setup);
    expect(fx.comfortTables).toBe(4);
    expect(fx.maxTables).toBe(6);
    expect(fx.handsMult).toBeCloseTo(1.05);
  });

  it('las mesas cómodas nunca superan las que aguanta el ordenador', () => {
    let g = rich();
    g = buyUpgrade(buyUpgrade(buyUpgrade(g, 'monitores'), 'monitores'), 'monitores');
    expect(setupEffects(g.setup).comfortTables).toBe(4);
  });

  it('no deja comprar sin dinero ni pasar del último nivel', () => {
    expect(() => buyUpgrade(newGame(1), 'pc')).toThrow();
    let g = rich();
    for (let i = 0; i < 3; i++) g = buyUpgrade(g, 'silla');
    expect(() => buyUpgrade(g, 'silla')).toThrow();
  });

  it('el ordenador limita las mesas que puedes abrir', () => {
    const g = rich();
    expect(validateAction(g, { type: 'play', limit: 'NL2', tables: 6, hours: 10 })).not.toBeNull();
    const g2 = buyUpgrade(g, 'pc');
    expect(validateAction(g2, { type: 'play', limit: 'NL2', tables: 6, hours: 10 })).toBeNull();
  });

  it('el solver hace que estudies más rápido y el HUD da habilidad', () => {
    let g = rich();
    const before = studyGainFor(g, 'postflop', 20);
    for (let i = 0; i < 3; i++) g = buyUpgrade(g, 'software');
    expect(studyGainFor(g, 'postflop', 20)).toBeCloseTo(before * 1.3, 6);
    expect(setupEffects(g.setup).skillBonus).toBe(5);
  });

  it('la suscripción del software suma a los gastos del mes', () => {
    let g = rich();
    for (let i = 0; i < 3; i++) g = buyUpgrade(g, 'software');
    expect(monthlyExpenses(g).subscriptions).toBe(15);
  });
});

describe('viviendas y gastos', () => {
  it('se pagan 12 meses al año', () => {
    let months = 0;
    for (let w = 0; w < C.WEEKS_PER_YEAR; w++) if (isMonthEnd(w)) months++;
    expect(months).toBe(12);
  });

  it('los gastos fijos se cobran al final de mes aunque no juegues', () => {
    let g: GameState = { ...newGame(1), bankroll: 50_000 };
    g = moveHome(g, 'piso');
    let paid = 0;
    for (let w = 0; w < C.WEEKS_PER_YEAR; w++) {
      const r = runWeek(g, { type: 'rest' });
      paid += r.expenses?.total ?? 0;
      g = r.after;
    }
    const monthly = monthlyExpenses(g).total;
    expect(paid).toBeCloseTo(monthly * 12, 6);
    expect(g.career.expensesEur).toBeCloseTo(monthly * 12, 6);
  });

  it('mudarse cuesta la fianza, sube la moral y da mejor descanso', () => {
    const g = rich();
    const moved = moveHome(g, 'piso');
    expect(moved.bankroll).toBe(20_000 - 1100);
    expect(moved.moral).toBeGreaterThan(g.moral);
    expect(weeklyRecovery(moved)).toBeGreaterThan(weeklyRecovery(g));
    expect(canMove(moved, 'piso')).not.toBeNull();
    expect(canMove(newGame(1), 'atico')).not.toBeNull();
  });

  it('la moral tiende a la de tu vivienda', () => {
    let g = { ...moveHome({ ...rich(), bankroll: 200_000 }, 'atico'), moral: 10 };
    for (let w = 0; w < 20; w++) g = runWeek(g, { type: 'study', topic: 'mental', hours: 10 }).after;
    expect(g.moral).toBeGreaterThan(80);
  });

  it('al arruinarte vuelves a casa de tus padres', () => {
    const g = { ...moveHome(rich(), 'piso'), bankroll: 1 };
    const r = runWeek(g, { type: 'rest' });
    expect(r.busted).toBe(true);
    expect(r.after.home).toBe('habitacion');
    expect(r.after.setup).toEqual(g.setup);
  });
});

describe('energía', () => {
  it('agotado solo puedes jugar unas pocas horas', () => {
    const g = { ...newGame(1), energy: 5 };
    expect(validateAction(g, { type: 'play', limit: 'NL2', tables: 2, hours: 30 })).toMatch(/agotado/);
    expect(validateAction(g, { type: 'play', limit: 'NL2', tables: 2, hours: 10 })).toBeNull();
  });

  it('jugar muchas horas cansa más que proporcionalmente', () => {
    const g = { ...newGame(1), bankroll: 1000 };
    const e30 = 100 - runWeek(g, { type: 'play', limit: 'NL2', tables: 2, hours: 30 }).after.energy;
    const e60 = 100 - runWeek(g, { type: 'play', limit: 'NL2', tables: 2, hours: 60 }).after.energy;
    expect(e60).toBeGreaterThan(e30 * 2);
  });
});

describe('migración', () => {
  it('carga partidas de la Fase 1 (versión 1)', () => {
    const v1 = { ...newGame(7) } as Partial<GameState>;
    delete v1.home;
    delete v1.setup;
    delete v1.moral;
    delete v1.downswing;
    const json = JSON.stringify({ game: 'poker-tycoon', version: 1, savedAt: 1, state: { ...v1, version: 1 } });
    const { state } = deserialize(json);
    expect(state.version).toBe(C.SAVE_VERSION);
    expect(state.home).toBe('habitacion');
    expect(state.setup).toEqual({ silla: 0, monitores: 0, pc: 0, software: 0 });
    expect(() => runWeek(state, { type: 'play', limit: 'NL2', tables: 2, hours: 10 })).not.toThrow();
  });
});
