/**
 * Todos los números de balance del juego.
 * Ajusta aquí rake, winrates, precios y umbrales sin tocar la lógica.
 */

export type LimitId =
  | 'NL2' | 'NL5' | 'NL10' | 'NL25' | 'NL50'
  | 'NL100' | 'NL200' | 'NL500' | 'NL1000' | 'NL2000';

export interface LimitConfig {
  id: LimitId;
  /** Ciega grande en € */
  bb: number;
  /** Dificultad del rival (misma escala que la habilidad, 0–100) */
  difficulty: number;
  /** Rake efectivo que paga un regular, en bb/100 */
  rake: number;
}

export const LIMITS: LimitConfig[] = [
  { id: 'NL2', bb: 0.02, difficulty: 15, rake: 12 },
  { id: 'NL5', bb: 0.05, difficulty: 22, rake: 11 },
  { id: 'NL10', bb: 0.1, difficulty: 30, rake: 9 },
  { id: 'NL25', bb: 0.25, difficulty: 38, rake: 8 },
  { id: 'NL50', bb: 0.5, difficulty: 46, rake: 7 },
  { id: 'NL100', bb: 1, difficulty: 54, rake: 6 },
  { id: 'NL200', bb: 2, difficulty: 62, rake: 5 },
  { id: 'NL500', bb: 5, difficulty: 70, rake: 4 },
  { id: 'NL1000', bb: 10, difficulty: 77, rake: 3.5 },
  { id: 'NL2000', bb: 20, difficulty: 84, rake: 3 },
];

/** Un buy-in son 100 ciegas grandes */
export const BUYIN_BB = 100;

// ── Sesiones ────────────────────────────────────────────────
export const HANDS_PER_HOUR_PER_TABLE = 70;
export const MIN_TABLES = 1;
export const MAX_TABLES = 8;
export const MIN_PLAY_HOURS = 1;
/** Horas máximas por semana entre todas las acciones */
export const MAX_WEEK_HOURS = 60;
/** Tamaño de cada tramo simulado (manos). Afecta a la forma de la gráfica, no a la media. */
export const CHUNK_HANDS = 200;
/** Desviación estándar en bb/100 */
export const STDDEV_BB100 = 90;
/** Puntos de la curva que se guardan por sesión para la gráfica histórica */
export const CURVE_SAMPLES_PER_SESSION = 6;

// ── Winrate ─────────────────────────────────────────────────
export const SKILL_WEIGHTS = { preflop: 0.3, postflop: 0.4, lectura: 0.3 } as const;
/** WR_bruto = WR_SCALE · tanh(E / WR_SOFTNESS) */
export const WR_SCALE = 30;
export const WR_SOFTNESS = 25;
/** Mesas que puedes jugar sin penalización (en la Fase 2 lo subirá el setup) */
export const BASE_COMFORT_TABLES = 2;
/** Puntos de habilidad que pierdes por cada mesa extra */
export const TABLE_PENALTY = 3;
/** Por debajo de esta energía juegas peor */
export const ENERGY_PENALTY_THRESHOLD = 50;
/** Puntos de habilidad perdidos por punto de energía bajo el umbral */
export const ENERGY_PENALTY_PER_POINT = 0.25;
/** bb/100 perdidas por punto de tilt */
export const TILT_WR_PENALTY = 0.15;

// ── Showdown / non-showdown ─────────────────────────────────
/** NSD medio (bb/100) = NSD_BASE + NSD_EDGE_FACTOR · E */
export const NSD_BASE = -12;
export const NSD_EDGE_FACTOR = 0.3;
export const NSD_STDDEV_BB100 = 20;

// ── Rakeback: sala ficticia ─────────────────────────────────
export const ROOM_NAME = 'Ases Pixel Poker';
/** Semanas que cuentan como "mes" para el nivel VIP */
export const VIP_WINDOW_WEEKS = 4;
export const VIP_LEVELS = [
  { name: 'Bronce', minRakeEur: 0, rakeback: 0.1 },
  { name: 'Plata', minRakeEur: 50, rakeback: 0.18 },
  { name: 'Oro', minRakeEur: 250, rakeback: 0.25 },
  { name: 'Platino', minRakeEur: 1000, rakeback: 0.32 },
  { name: 'Diamante', minRakeEur: 4000, rakeback: 0.4 },
] as const;

// ── Habilidades ─────────────────────────────────────────────
export const START_SKILL = 25;
export const SKILL_MAX = 100;
/** Ganancia por hora de estudio = STUDY_GAIN_PER_HOUR · (100 − habilidad)/100 */
export const STUDY_GAIN_PER_HOUR = 0.15;
export const MIN_STUDY_HOURS = 5;
export const MAX_STUDY_HOURS = 40;
/** Puntos de Postflop y Lectura por cada 10.000 manos jugadas (antes del factor decreciente) */
export const PLAY_XP_PER_10K_HANDS = 0.15;

// ── Energía y tilt ──────────────────────────────────────────
export const START_ENERGY = 100;
/** Recuperación natural cada semana (dormir) */
export const WEEKLY_ENERGY_RECOVERY = 20;
/** Energía por hora de juego = base + porMesa · mesas */
export const PLAY_ENERGY_PER_HOUR_BASE = 0.9;
export const PLAY_ENERGY_PER_HOUR_PER_TABLE = 0.1;
export const STUDY_ENERGY_PER_HOUR = 0.5;
export const REST_ENERGY = 60;
export const REST_TILT = 30;
/** Bajada natural del tilt por semana = base + Mental / divisor */
export const TILT_DECAY_BASE = 8;
export const TILT_DECAY_MENTAL_DIVISOR = 5;
/** Tilt que suma cada buy-in perdido en una sesión (antes del Mental) */
export const TILT_PER_BUYIN_LOST = 4;
/** Tilt que resta cada buy-in ganado */
export const TILT_RELIEF_PER_BUYIN_WON = 1;

// ── Bankroll ────────────────────────────────────────────────
export const START_BANKROLL = 50;
/** Buy-ins recomendados para jugar un límite */
export const RECOMMENDED_BUYINS = 30;
/** Fracción de habilidad que conservas al arruinarte */
export const BUST_SKILL_RETENTION = 0.7;

// ── Tiempo ──────────────────────────────────────────────────
export const WEEKS_PER_YEAR = 52;
export const GAME_YEARS = 10;
/** Duración en ms de una semana a velocidad x1 */
export const WEEK_DURATION_MS = 4000;

// ── Guardado ────────────────────────────────────────────────
export const SAVE_SLOTS = 3;
export const SAVE_KEY_PREFIX = 'poker-tycoon-slot-';
export const SAVE_VERSION = 1;
