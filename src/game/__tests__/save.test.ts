import { describe, expect, it } from 'vitest';
import { deleteSlot, deserialize, listSlots, saveToSlot, serialize, type KV } from '../save';
import { newGame } from '../state';
import { runWeek } from '../week';

function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

describe('guardado', () => {
  it('exporta e importa la misma partida', () => {
    const g = runWeek(newGame(9), { type: 'play', limit: 'NL2', tables: 2, hours: 10 }).after;
    const { state } = deserialize(serialize(g));
    expect(state).toEqual(g);
  });

  it('rechaza archivos que no son partidas', () => {
    expect(() => deserialize('hola')).toThrow('JSON');
    expect(() => deserialize('{"a":1}')).toThrow('Poker Tycoon');
  });

  it('gestiona 3 ranuras', () => {
    const kv = memoryKV();
    saveToSlot(kv, 1, newGame(1));
    const slots = listSlots(kv);
    expect(slots).toHaveLength(3);
    expect(slots[0].state).toBeNull();
    expect(slots[1].state?.seed).toBe(1);
    deleteSlot(kv, 1);
    expect(listSlots(kv)[1].state).toBeNull();
  });
});
