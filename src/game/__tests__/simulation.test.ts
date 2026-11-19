import { describe, expect, it } from 'vitest';
import * as C from '../config';
import { Rng } from '../rng';
import { expectedWinrate, sampleHands, simulateSession, vipLevelFor } from '../simulation';
import type { Skills } from '../types';

const skills = (v: number): Skills => ({ preflop: v, postflop: v, lectura: v, mental: v });
const base = { tables: 1, energy: 100, tilt: 0 };

describe('Rng', () => {
  it('es determinista con la misma semilla', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('la normal tiene media 0 y desviación 1', () => {
    const r = new Rng(7);
    const n = 100000;
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const x = r.normal();
      sum += x;
      sq += x * x;
    }
    const mean = sum / n;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.sqrt(sq / n - mean * mean)).toBeCloseTo(1, 1);
  });
});

describe('expectedWinrate', () => {
  it('un principiante en NL2 está cerca del break-even (antes de rakeback)', () => {
    const wr = expectedWinrate({ skills: skills(25), limit: 'NL2', ...base }).netWR;
    expect(wr).toBeGreaterThan(-3);
    expect(wr).toBeLessThan(1);
  });

  it('un regular de NL2 gana unos +8 bb/100', () => {
    const wr = expectedWinrate({ skills: skills(35), limit: 'NL2', ...base }).netWR;
    expect(wr).toBeGreaterThan(6);
    expect(wr).toBeLessThan(10);
  });

  it('en NL500 hace falta mucha habilidad', () => {
    expect(expectedWinrate({ skills: skills(80), limit: 'NL500', ...base }).netWR).toBeGreaterThan(4);
    expect(expectedWinrate({ skills: skills(60), limit: 'NL500', ...base }).netWR).toBeLessThan(-10);
  });

  it('el winrate baja al subir de límite', () => {
    let prev = Infinity;
    for (const l of C.LIMITS) {
      const wr = expectedWinrate({ skills: skills(60), limit: l.id, ...base }).netWR;
      expect(wr).toBeLessThan(prev);
      prev = wr;
    }
  });

  it('tilt, poca energía y demasiadas mesas penalizan', () => {
    const ref = expectedWinrate({ skills: skills(50), limit: 'NL25', ...base }).netWR;
    expect(expectedWinrate({ skills: skills(50), limit: 'NL25', ...base, tilt: 50 }).netWR).toBeCloseTo(ref - 7.5, 5);
    expect(expectedWinrate({ skills: skills(50), limit: 'NL25', ...base, energy: 10 }).netWR).toBeLessThan(ref);
    expect(expectedWinrate({ skills: skills(50), limit: 'NL25', ...base, tables: 8 }).netWR).toBeLessThan(ref);
    expect(expectedWinrate({ skills: skills(50), limit: 'NL25', ...base, tables: 2 }).netWR).toBe(ref);
  });
});

describe('varianza', () => {
  it('la desviación por 100 manos es ~90 bb', () => {
    const r = new Rng(123);
    const n = 50000;
    const xs = Array.from({ length: n }, () => sampleHands(r, 100, 5));
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / n);
    expect(mean).toBeGreaterThan(3);
    expect(mean).toBeLessThan(7);
    expect(sd).toBeGreaterThan(87);
    expect(sd).toBeLessThan(93);
  });

  it('en 1 millón de manos el bb/100 converge al esperado', () => {
    const sim = simulateSession(new Rng(99), { limit: 'NL2', hands: 1_000_000, netWR: 4, edge: 20, bankroll: 1e9 });
    const wr = (sim.netBB / sim.hands) * 100;
    expect(Math.abs(wr - 4)).toBeLessThan(3); // ~3σ
    expect(sim.sdBB + sim.nsdBB).toBeCloseTo(sim.netBB, 6);
    expect(sim.nsdBB).toBeLessThan(0);
  });

  it('un ganador también sufre downswings de 10+ buy-ins en 100k manos', () => {
    let count = 0;
    for (let seed = 0; seed < 50; seed++) {
      const sim = simulateSession(new Rng(seed), { limit: 'NL2', hands: 100_000, netWR: 5, edge: 20, bankroll: 1e9 });
      let peak = 0;
      let dd = 0;
      for (const v of sim.cumTrace) {
        peak = Math.max(peak, v);
        dd = Math.max(dd, peak - v);
      }
      if (dd >= 1000) count++;
    }
    expect(count).toBeGreaterThan(25);
  });

  it('corta la sesión si el bankroll baja de un buy-in', () => {
    const sim = simulateSession(new Rng(1), { limit: 'NL10', hands: 50_000, netWR: -60, edge: -30, bankroll: 12 });
    expect(sim.stoppedEarly).toBe(true);
    expect(sim.hands).toBeLessThan(50_000);
  });
});

describe('rakeback', () => {
  it('sube de nivel VIP con el rake del mes', () => {
    expect(vipLevelFor(0).name).toBe('Bronce');
    expect(vipLevelFor(60).name).toBe('Plata');
    expect(vipLevelFor(5000).name).toBe('Diamante');
  });
});
