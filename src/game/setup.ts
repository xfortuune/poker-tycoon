import * as C from './config';
import type { HomeConfig, HomeId, UpgradeCategory, UpgradeItem } from './config';
import type { ExpensesBreakdown, GameState, Setup } from './types';

export const EMPTY_SETUP: Setup = { silla: 0, monitores: 0, pc: 0, software: 0 };

export interface SetupEffects {
  comfortTables: number;
  maxTables: number;
  energyCostMult: number;
  energyRecovery: number;
  handsMult: number;
  skillBonus: number;
  studyMult: number;
}

export function getHome(id: HomeId): HomeConfig {
  const h = C.HOMES.find((x) => x.id === id);
  if (!h) throw new Error(`Vivienda desconocida: ${id}`);
  return h;
}

export function homeIndex(id: HomeId): number {
  return C.HOMES.findIndex((h) => h.id === id);
}

export function currentItem(setup: Setup, cat: UpgradeCategory): UpgradeItem {
  return C.UPGRADES[cat][setup[cat]];
}

export function nextItem(setup: Setup, cat: UpgradeCategory): UpgradeItem | undefined {
  return C.UPGRADES[cat][setup[cat] + 1];
}

/** Efectos combinados del setup actual (cada categoría aporta los de su nivel) */
export function setupEffects(setup: Setup): SetupEffects {
  const e: SetupEffects = {
    comfortTables: C.BASE_COMFORT_TABLES,
    maxTables: C.MAX_TABLES,
    energyCostMult: 1,
    energyRecovery: 0,
    handsMult: 1,
    skillBonus: 0,
    studyMult: 1,
  };
  for (const { id } of C.UPGRADE_CATEGORIES) {
    const fx = currentItem(setup, id).effects;
    if (fx.comfortTables !== undefined) e.comfortTables = fx.comfortTables;
    if (fx.maxTables !== undefined) e.maxTables = fx.maxTables;
    if (fx.energyCostMult !== undefined) e.energyCostMult *= fx.energyCostMult;
    if (fx.handsMult !== undefined) e.handsMult *= fx.handsMult;
    e.energyRecovery += fx.energyRecovery ?? 0;
    e.skillBonus += fx.skillBonus ?? 0;
    if (fx.studyMult !== undefined) e.studyMult *= fx.studyMult;
  }
  e.comfortTables = Math.min(e.comfortTables, e.maxTables);
  return e;
}

export function monthlyExpenses(state: Pick<GameState, 'home' | 'setup'>): ExpensesBreakdown {
  const h = getHome(state.home);
  const subscriptions = C.UPGRADE_CATEGORIES.reduce((a, { id }) => a + currentItem(state.setup, id).monthly, 0);
  return {
    rent: h.rent,
    food: h.food,
    bills: h.bills,
    subscriptions,
    total: h.rent + h.food + h.bills + subscriptions,
  };
}

/** Mes global (0, 1, 2…) al que pertenece una semana */
export function monthOf(week: number): number {
  return Math.floor((week * 12) / C.WEEKS_PER_YEAR);
}

/** ¿Al terminar esta semana empieza un mes nuevo y toca pagar los gastos? */
export function isMonthEnd(week: number): boolean {
  return monthOf(week + 1) > monthOf(week);
}

/** Energía que recuperas cada semana sin contar la acción */
export function weeklyRecovery(state: Pick<GameState, 'home' | 'setup' | 'moral'>): number {
  return (
    C.WEEKLY_ENERGY_RECOVERY +
    getHome(state.home).energyRecovery +
    setupEffects(state.setup).energyRecovery +
    (state.moral - 50) / C.MORAL_ENERGY_DIVISOR
  );
}

export function canBuy(state: GameState, cat: UpgradeCategory): string | null {
  const next = nextItem(state.setup, cat);
  if (!next) return 'Ya tienes lo mejor.';
  if (state.bankroll < next.price) return 'No tienes suficiente dinero.';
  return null;
}

/** Compra el siguiente nivel de una categoría. Función pura. */
export function buyUpgrade(state: GameState, cat: UpgradeCategory): GameState {
  const err = canBuy(state, cat);
  if (err) throw new Error(err);
  const next = nextItem(state.setup, cat)!;
  return {
    ...state,
    bankroll: state.bankroll - next.price,
    setup: { ...state.setup, [cat]: state.setup[cat] + 1 },
    career: { ...state.career, spentEur: state.career.spentEur + next.price },
  };
}

export function canMove(state: GameState, id: HomeId): string | null {
  if (id === state.home) return 'Ya vives aquí.';
  const h = getHome(id);
  if (state.bankroll < h.moveCost) return 'No tienes suficiente dinero para la mudanza.';
  return null;
}

/** Te mudas: pagas la mudanza y la fianza (no recuperable) y sube la moral. */
export function moveHome(state: GameState, id: HomeId): GameState {
  const err = canMove(state, id);
  if (err) throw new Error(err);
  const h = getHome(id);
  const upgrade = homeIndex(id) > homeIndex(state.home);
  return {
    ...state,
    home: id,
    bankroll: state.bankroll - h.moveCost,
    moral: upgrade ? Math.min(100, Math.max(state.moral, h.moral) + C.MORAL_MOVE_BONUS) : state.moral,
    career: { ...state.career, spentEur: state.career.spentEur + h.moveCost, moves: state.career.moves + 1 },
  };
}

/** Recomendación para mudarse: mudanza + N meses de gastos + 30 buy-ins de tu límite */
export function moveRecommendation(state: GameState, id: HomeId, buyin: number): number {
  const h = getHome(id);
  const exp = monthlyExpenses({ home: id, setup: state.setup }).total;
  return h.moveCost + exp * C.MOVE_RECOMMENDED_MONTHS + buyin * C.RECOMMENDED_BUYINS;
}
