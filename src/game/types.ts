import type { HomeId, LimitId, StreamGearId, UpgradeCategory } from './config';

export type { HomeId, LimitId, StreamGearId, UpgradeCategory };

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
  /** Sesión jugada en directo */
  streamed?: boolean;
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
  weeksStreamed: number;
  weeksCoached: number;
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
  /** Sueldos de los coaches y plataforma de la escuela */
  school: number;
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
  stream: StreamState;
  coaching: CoachingState;
  school: SchoolState;
  /** Rake pagado (€) en las últimas semanas, para el nivel VIP */
  rakeHistory: number[];
  limitStats: Partial<Record<LimitId, LimitStats>>;
  sessions: SessionRecord[];
  career: CareerStats;
  createdAt: number;
}

export type WeekAction =
  | { type: 'play'; limit: LimitId; tables: number; hours: number }
  | { type: 'stream'; limit: LimitId; tables: number; hours: number }
  | { type: 'study'; topic: SkillId; hours: number }
  | { type: 'coach'; hours: number }
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
  stream?: StreamOutcome;
  coach?: CoachOutcome;
  school?: SchoolOutcome;
  /** Fama antes y después */
  fameDelta: number;
  /** Gastos del mes, si esta semana tocaba pagarlos */
  expenses?: ExpensesBreakdown;
  busted: boolean;
  messages: string[];
}

export type StreamGear = Record<StreamGearId, number>;

export interface StreamState {
  gear: StreamGear;
  subs: number;
  hours: number;
  incomeEur: number;
  virals: number;
  maxFollowers: number;
  /** Media de espectadores del último directo */
  lastViewers: number;
  weeksSinceStream: number;
}

export interface CoachingState {
  reputation: number;
  hours: number;
  incomeEur: number;
  /** Alumnos de la última semana de clases */
  students: number;
}

export interface Coach {
  id: number;
  name: string;
  /** Nivel del coach (40–90) */
  skill: number;
  specialty: SkillId;
  /** Sueldo mensual (€) */
  salary: number;
}

export interface Course {
  id: number;
  topic: SkillId;
  title: string;
  quality: number;
  price: number;
  createdWeek: number;
  sales: number;
  incomeEur: number;
}

export interface SchoolState {
  open: boolean;
  members: number;
  coaches: Coach[];
  /** Coaches disponibles para contratar (se renuevan cada mes) */
  candidates: Coach[];
  courses: Course[];
  incomeEur: number;
  nextId: number;
}

export interface StreamOutcome {
  viewers: number;
  newFollowers: number;
  churned: number;
  viral?: string;
  viralFollowers: number;
  subs: number;
  subsEur: number;
  donationsEur: number;
  sponsorEur: number;
  totalEur: number;
}

export interface CoachOutcome {
  hoursOffered: number;
  hoursSold: number;
  rate: number;
  incomeEur: number;
  students: number;
  reputationDelta: number;
}

export interface SchoolOutcome {
  members: number;
  membersDelta: number;
  membershipEur: number;
  courseSales: number;
  courseEur: number;
  totalEur: number;
}
