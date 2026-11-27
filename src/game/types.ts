import type { HomeId, LimitId, UpgradeCategory } from './config';

export type { HomeId, LimitId, UpgradeCategory };

export type SkillId = 'preflop' | 'postflop' | 'lectura' | 'mental';

export type Skills = Record<SkillId, number>;

export interface LimitStats {
  hands: number;
  netBB: number;
  sdBB: number;
  nsdBB: number;
  netEur: number;
  rakeEur: number;
  /** Para calcular el mayor downswing en bb dentro del límite */
  cumBB: number;
  peakBB: number;
  maxDownswingBB: number;
}

/** Punto de la curva: [manos acumuladas en la sesión, neto bb, showdown bb] */
export type CurvePoint = [number, number, number];

export interface SessionRecord {
  week: number;
  limit: LimitId;
  tables: number;
  hours: number;
  hands: number;
  netBB: number;
  sdBB: number;
  nsdBB: number;
  netEur: number;
  rakeEur: number;
  rakebackEur: number;
  /** Muestras intermedias de la sesión (incluye el punto final) */
  curve: CurvePoint[];
}

export interface CareerStats {
  hands: number;
  netEur: number;
  rakeEur: number;
  rakebackEur: number;
  /** Ganancias de juego acumuladas en € (sin rakeback), para el downswing global */
  cumEur: number;
  peakEur: number;
  maxDownswingEur: number;
  busts: number;
  /** Índice del límite más alto jugado (-1 = ninguno) */
  maxLimitIndex: number;
  weeksPlayed: number;
  weeksStudied: number;
  weeksRested: number;
  /** Gastos fijos pagados (alquiler, comida, suscripciones) */
  expensesEur: number;
  /** Dinero gastado en mejoras y mudanzas */
  spentEur: number;
  /** Mayor downswing de la carrera en buy-ins (del límite en que ocurrió cada tramo) */
  maxDownswingBI: number;
  badBeats: number;
  moves: number;
}

/** Downswing de la carrera medido en buy-ins, para los eventos de tilt */
export interface DownswingState {
  cumBI: number;
  peakBI: number;
  /** Cuántos eventos de DOWNSWING_EVENTS se han anunciado desde el último máximo */
  announced: number;
}

export type Setup = Record<UpgradeCategory, number>;

export type SessionEventKind = 'badbeat' | 'cooler' | 'herocall' | 'downswing' | 'exhausted';

export interface SessionEvent {
  /** Manos jugadas en la sesión cuando ocurrió */
  hand: number;
  kind: SessionEventKind;
  text: string;
  tiltDelta: number;
}

export interface ExpensesBreakdown {
  rent: number;
  food: number;
  bills: number;
  subscriptions: number;
  total: number;
}

export interface GameState {
  version: number;
  seed: number;
  /** Estado interno del generador aleatorio */
  rng: number;
  /** Semanas transcurridas (0 = semana 1 del año 1) */
  week: number;
  bankroll: number;
  skills: Skills;
  energy: number;
  tilt: number;
  fame: number;
  followers: number;
  moral: number;
  home: HomeId;
  setup: Setup;
  downswing: DownswingState;
  /** Rake pagado (€) en las últimas semanas, para el nivel VIP */
  rakeHistory: number[];
  limitStats: Partial<Record<LimitId, LimitStats>>;
  sessions: SessionRecord[];
  career: CareerStats;
  createdAt: number;
}

export type WeekAction =
  | { type: 'play'; limit: LimitId; tables: number; hours: number }
  | { type: 'study'; topic: SkillId; hours: number }
  | { type: 'rest' };

export interface PlayOutcome {
  limit: LimitId;
  tables: number;
  hoursPlanned: number;
  hands: number;
  netBB: number;
  sdBB: number;
  nsdBB: number;
  netEur: number;
  rakeEur: number;
  rakebackEur: number;
  vipLevel: string;
  rakebackRate: number;
  /** Winrate esperado al empezar la sesión (bb/100) */
  expectedWR: number;
  /** Ganancia acumulada en € tras cada tramo (para la animación y el resumen) */
  curveEur: number[];
  /** La sesión terminó antes (sin buy-ins o sin energía) */
  stoppedEarly: boolean;
  stopReason?: 'bankroll' | 'energia';
  /** Winrate medio realmente aplicado (con tilt y cansancio dinámicos) */
  avgWR: number;
  /** Eventos de la sesión: bad beats, coolers, hero calls, downswings */
  events: SessionEvent[];
}

export interface WeekResult {
  action: WeekAction;
  before: GameState;
  after: GameState;
  play?: PlayOutcome;
  skillDelta: Partial<Skills>;
  energyDelta: number;
  tiltDelta: number;
  bankrollDelta: number;
  moralDelta: number;
  /** Gastos del mes, si esta semana tocaba pagarlos */
  expenses?: ExpensesBreakdown;
  busted: boolean;
  messages: string[];
}
