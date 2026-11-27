import * as C from './config';
import { newCoachingState } from './coaching';
import { newSchoolState } from './school';
import { computeFame, newStreamState } from './streaming';
import type { GameState } from './types';

export interface SlotInfo {
  slot: number;
  state: GameState | null;
  savedAt: number | null;
}

interface SaveFile {
  game: 'poker-tycoon';
  version: number;
  savedAt: number;
  state: GameState;
}

/** Interfaz mínima de almacenamiento (localStorage en el navegador, un Map en los tests) */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serialize(state: GameState, savedAt = Date.now()): string {
  const file: SaveFile = { game: 'poker-tycoon', version: C.SAVE_VERSION, savedAt, state };
  return JSON.stringify(file);
}

/** Lee y valida una partida. Lanza un error con un mensaje en español si no es válida. */
export function deserialize(json: string): { state: GameState; savedAt: number } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const f = data as Partial<SaveFile>;
  if (!f || f.game !== 'poker-tycoon' || !f.state) {
    throw new Error('El archivo no es una partida de Poker Tycoon.');
  }
  if (typeof f.version !== 'number' || f.version > C.SAVE_VERSION) {
    throw new Error('La partida es de una versión más nueva del juego.');
  }
  const st = migrate(f.state as GameState, f.version);
  if (!isValidState(st)) throw new Error('La partida está dañada.');
  return { state: st, savedAt: f.savedAt ?? Date.now() };
}

/** Actualiza partidas guardadas con versiones anteriores del juego */
export function migrate(state: GameState, from: number): GameState {
  let s = { ...state };
  if (from < 2) {
    // Fase 2: vivienda, setup, moral, downswing de carrera y nuevas estadísticas
    s = {
      ...s,
      moral: C.HOMES[0].moral,
      home: 'habitacion',
      setup: { silla: 0, monitores: 0, pc: 0, software: 0 },
      downswing: { cumBI: 0, peakBI: 0, announced: 0 },
      career: {
        ...s.career,
        expensesEur: 0,
        spentEur: 0,
        maxDownswingBI: 0,
        badBeats: 0,
        moves: 0,
      },
    };
  }
  if (from < 3) {
    // Fase 3: streaming, coaching y escuela
    s = {
      ...s,
      fame: s.fame ?? 0,
      followers: s.followers ?? 0,
      stream: newStreamState(),
      coaching: newCoachingState(),
      school: newSchoolState(),
      career: { ...s.career, weeksStreamed: 0, weeksCoached: 0 },
    };
    s.fame = computeFame(s);
  }
  return { ...s, version: C.SAVE_VERSION };
}

function isValidState(s: GameState): boolean {
  return (
    typeof s.week === 'number' &&
    typeof s.bankroll === 'number' &&
    Number.isFinite(s.bankroll) &&
    typeof s.rng === 'number' &&
    !!s.skills &&
    ['preflop', 'postflop', 'lectura', 'mental'].every((k) => typeof (s.skills as never)[k] === 'number') &&
    Array.isArray(s.sessions) &&
    !!s.career
  );
}

const key = (slot: number) => `${C.SAVE_KEY_PREFIX}${slot}`;

export function saveToSlot(kv: KV, slot: number, state: GameState): void {
  kv.setItem(key(slot), serialize(state));
}

export function loadSlot(kv: KV, slot: number): SlotInfo {
  const raw = kv.getItem(key(slot));
  if (!raw) return { slot, state: null, savedAt: null };
  try {
    const { state, savedAt } = deserialize(raw);
    return { slot, state, savedAt };
  } catch {
    return { slot, state: null, savedAt: null };
  }
}

export function listSlots(kv: KV): SlotInfo[] {
  return Array.from({ length: C.SAVE_SLOTS }, (_, i) => loadSlot(kv, i));
}

export function deleteSlot(kv: KV, slot: number): void {
  kv.removeItem(key(slot));
}
