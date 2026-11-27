import { create } from 'zustand';
import * as C from './game/config';
import type { HomeId, UpgradeCategory } from './game/config';
import { buyUpgrade, getHome, moveHome } from './game/setup';
import { deleteSlot, deserialize, listSlots, saveToSlot, serialize, type SlotInfo } from './game/save';
import { newGame } from './game/state';
import type { GameState, WeekAction, WeekResult } from './game/types';
import { runWeek, suggestLimit } from './game/week';

export type ModalId = 'play' | 'study' | 'rest' | 'stats' | 'graph' | 'save' | 'shop' | null;
export type Speed = 1 | 2 | 4;

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'bad';
}

interface Running {
  result: WeekResult;
  progress: number;
  /** Eventos de la sesión ya mostrados como toast */
  shownEvents: number;
}

interface Store {
  screen: 'title' | 'game';
  slot: number;
  slots: SlotInfo[];
  game: GameState | null;
  running: Running | null;
  paused: boolean;
  speed: Speed;
  summary: WeekResult | null;
  modal: ModalId;
  toasts: Toast[];

  refreshSlots(): void;
  startNew(slot: number): void;
  loadGame(slot: number): void;
  deleteGame(slot: number): void;
  importGame(json: string, slot: number): void;
  exportGame(): string | null;
  saveNow(): void;
  toTitle(): void;

  openModal(m: ModalId): void;
  doAction(a: WeekAction): void;
  buy(cat: UpgradeCategory): void;
  move(home: HomeId): void;
  tick(dtMs: number): void;
  setSpeed(s: Speed): void;
  togglePause(): void;
  closeSummary(): void;
  toast(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
}

const storage = typeof localStorage !== 'undefined' ? localStorage : null;
let toastId = 0;

export const useStore = create<Store>((set, get) => ({
  screen: 'title',
  slot: 0,
  slots: storage ? listSlots(storage) : [],
  game: null,
  running: null,
  paused: false,
  speed: 1,
  summary: null,
  modal: null,
  toasts: [],

  refreshSlots() {
    if (storage) set({ slots: listSlots(storage) });
  },

  startNew(slot) {
    const game = newGame();
    if (storage) saveToSlot(storage, slot, game);
    set({ screen: 'game', slot, game, running: null, summary: null, modal: null });
    get().refreshSlots();
    get().toast('¡Bienvenido! Empiezas en tu habitación con 50 € en NL2.', 'info');
  },

  loadGame(slot) {
    const info = get().slots[slot];
    if (!info?.state) return;
    set({ screen: 'game', slot, game: info.state, running: null, summary: null, modal: null });
  },

  deleteGame(slot) {
    if (storage) deleteSlot(storage, slot);
    get().refreshSlots();
  },

  importGame(json, slot) {
    try {
      const { state } = deserialize(json);
      if (storage) saveToSlot(storage, slot, state);
      get().refreshSlots();
      set({ screen: 'game', slot, game: state, running: null, summary: null, modal: null });
      get().toast(`Partida importada en la ranura ${slot + 1}.`, 'good');
    } catch (e) {
      get().toast((e as Error).message, 'bad');
    }
  },

  exportGame() {
    const g = get().game;
    return g ? serialize(g) : null;
  },

  saveNow() {
    const { game, slot } = get();
    if (game && storage) {
      saveToSlot(storage, slot, game);
      get().refreshSlots();
    }
  },

  toTitle() {
    get().saveNow();
    set({ screen: 'title', game: null, running: null, summary: null, modal: null });
  },

  openModal(m) {
    if (get().running) return;
    set({ modal: m });
  },

  doAction(a) {
    const { game, running } = get();
    if (!game || running) return;
    try {
      const result = runWeek(game, a);
      set({ running: { result, progress: 0, shownEvents: 0 }, modal: null, paused: false, summary: null });
    } catch (e) {
      get().toast((e as Error).message, 'bad');
    }
  },

  tick(dt) {
    const { running, paused, speed } = get();
    if (!running || paused) return;
    const progress = Math.min(1, running.progress + (dt * speed) / C.WEEK_DURATION_MS);
    if (progress < 1) {
      // Muestra los eventos (bad beats, hero calls…) cuando la animación llega a ellos
      const play = running.result.play;
      let shown = running.shownEvents;
      if (play) {
        const handsNow = progress * play.hands;
        while (shown < play.events.length && play.events[shown].hand <= handsNow) {
          const ev = play.events[shown];
          get().toast(ev.text, ev.kind === 'herocall' ? 'good' : 'bad');
          shown++;
        }
      }
      set({ running: { ...running, progress, shownEvents: shown } });
      return;
    }
    const r = running.result;
    for (const ev of r.play?.events.slice(running.shownEvents) ?? []) get().toast(ev.text, ev.kind === 'herocall' ? 'good' : 'bad');
    set({ game: r.after, running: null, summary: r });
    get().saveNow();
    for (const m of r.messages) get().toast(m, r.busted ? 'bad' : 'info');
    const sug = suggestLimit(r.after);
    if (sug.up) get().toast(sug.up, 'good');
    if (sug.down) get().toast(sug.down, 'bad');
  },

  buy(cat) {
    const { game, running } = get();
    if (!game || running) return;
    try {
      const next = buyUpgrade(game, cat);
      const item = C.UPGRADES[cat][next.setup[cat]];
      set({ game: next });
      get().saveNow();
      get().toast(`Has comprado: ${item.name}.`, 'good');
    } catch (e) {
      get().toast((e as Error).message, 'bad');
    }
  },

  move(home) {
    const { game, running } = get();
    if (!game || running) return;
    try {
      const next = moveHome(game, home);
      set({ game: next });
      get().saveNow();
      get().toast(`¡Te has mudado! Nueva casa: ${getHome(home).name}.`, 'good');
    } catch (e) {
      get().toast((e as Error).message, 'bad');
    }
  },

  setSpeed(s) {
    set({ speed: s, paused: false });
  },

  togglePause() {
    set({ paused: !get().paused });
  },

  closeSummary() {
    set({ summary: null });
  },

  toast(text, kind = 'info') {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, kind }].slice(-4) });
    setTimeout(() => get().dismissToast(id), 6000);
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
