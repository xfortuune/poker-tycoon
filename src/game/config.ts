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
  { id: 'NL2', bb: 0.02, difficulty: 12, rake: 12 },
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
export const STUDY_GAIN_PER_HOUR = 0.25;
export const MIN_STUDY_HOURS = 5;
export const MAX_STUDY_HOURS = 40;
/** Puntos de Preflop, Postflop y Lectura por cada 10.000 manos jugadas (antes del factor decreciente) */
export const PLAY_XP_PER_10K_HANDS = 0.6;

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
/**
 * Tilt dentro de la sesión: sube cada vez que marcas un nuevo mínimo de la sesión
 * (por cada buy-in que te hundes por debajo del peor punto) y baja al marcar nuevos máximos.
 */
export const TILT_PER_BUYIN_NEW_LOW = 3;
export const TILT_RELIEF_PER_BUYIN_NEW_HIGH = 1;
/** Factor del Mental sobre el tilt que recibes: 1 − Mental/200 (Mental 100 = la mitad) */
export const TILT_MENTAL_DIVISOR = 200;
/** Con poca energía te calientas antes */
export const TILT_FATIGUE_THRESHOLD = 30;
export const TILT_FATIGUE_MULT = 1.3;

// ── Eventos de tilt (por tramo de CHUNK_HANDS manos) ────────
/** Un tramo con z ≤ este valor es un bad beat o un cooler */
export const BAD_BEAT_Z = -2;
export const BAD_BEAT_TILT = 8;
/** Un tramo con z ≥ este valor es un hero call / mano épica */
export const HERO_CALL_Z = 2.2;
export const HERO_CALL_TILT_RELIEF = 5;
/** Downswings de la carrera (en buy-ins desde el máximo) que disparan un evento */
export const DOWNSWING_EVENTS = [
  { buyins: 10, tilt: 12 },
  { buyins: 20, tilt: 15 },
  { buyins: 30, tilt: 18 },
] as const;
/** Si la energía llega a 0 en mitad de la sesión, la cortas */
export const EXHAUSTION_ENERGY = 0;
/** Con menos energía que esto al empezar la semana solo puedes jugar o estudiar unas pocas horas */
export const EXHAUSTED_THRESHOLD = 15;
export const EXHAUSTED_MAX_HOURS = 10;
/** Horas de juego a partir de las que cada hora cansa más */
export const LONG_WEEK_HOURS = 40;
export const LONG_WEEK_ENERGY_MULT = 1.5;

// ── Moral ───────────────────────────────────────────────────
/** Cada semana la moral se acerca este % a la moral base de tu vivienda */
export const MORAL_DRIFT = 0.25;
/** Moral por buy-in ganado/perdido en la semana (con tope) */
export const MORAL_PER_BUYIN = 1.5;
export const MORAL_WEEK_MAX_GAIN = 6;
export const MORAL_WEEK_MAX_LOSS = 8;
export const MORAL_REST_BONUS = 4;
export const MORAL_MOVE_BONUS = 15;
export const MORAL_AFTER_BUST = 20;
/** Energía extra por semana = (moral − 50) / divisor */
export const MORAL_ENERGY_DIVISOR = 5;
/** Bajada de tilt extra por semana = (moral − 50) / divisor */
export const MORAL_TILT_DIVISOR = 10;
/** Con la moral por debajo de esto estudias peor */
export const MORAL_LOW_STUDY = 30;
export const MORAL_LOW_STUDY_MULT = 0.8;

// ── Mejoras del setup ───────────────────────────────────────
export type UpgradeCategory = 'silla' | 'monitores' | 'pc' | 'software';

export interface UpgradeEffects {
  /** Mesas sin penalización */
  comfortTables?: number;
  /** Mesas máximas que puedes abrir */
  maxTables?: number;
  /** Multiplicador del gasto de energía al jugar */
  energyCostMult?: number;
  /** Energía extra recuperada cada semana */
  energyRecovery?: number;
  /** Multiplicador de manos por hora */
  handsMult?: number;
  /** Puntos de habilidad efectiva en mesa (HUD) */
  skillBonus?: number;
  /** Multiplicador de lo que aprendes estudiando */
  studyMult?: number;
}

export interface UpgradeItem {
  name: string;
  price: number;
  /** Suscripción mensual (€) */
  monthly: number;
  desc: string;
  effects: UpgradeEffects;
}

export const UPGRADE_CATEGORIES: { id: UpgradeCategory; name: string }[] = [
  { id: 'silla', name: 'Silla' },
  { id: 'monitores', name: 'Monitores' },
  { id: 'pc', name: 'Ordenador' },
  { id: 'software', name: 'Software' },
];

export const UPGRADES: Record<UpgradeCategory, UpgradeItem[]> = {
  silla: [
    { name: 'Silla plegable', price: 0, monthly: 0, desc: 'Cruje cada vez que haces un fold.', effects: { energyCostMult: 1.1 } },
    { name: 'Silla de oficina', price: 120, monthly: 0, desc: 'Ruedas y respaldo. Un lujo.', effects: { energyCostMult: 1, energyRecovery: 3 } },
    { name: 'Silla gaming', price: 400, monthly: 0, desc: 'Con cojín lumbar y rayas rojas.', effects: { energyCostMult: 0.92, energyRecovery: 5 } },
    { name: 'Silla ergonómica pro', price: 1200, monthly: 0, desc: 'Tu espalda te lo agradecerá.', effects: { energyCostMult: 0.82, energyRecovery: 8 } },
  ],
  monitores: [
    { name: 'Pantalla del portátil', price: 0, monthly: 0, desc: '15 pulgadas para todo.', effects: { comfortTables: 2 } },
    { name: 'Monitor de 24"', price: 150, monthly: 0, desc: 'Ya caben 4 mesas sin solaparse.', effects: { comfortTables: 4 } },
    { name: 'Dos monitores', price: 450, monthly: 0, desc: 'Setup de regular: 6 mesas cómodas.', effects: { comfortTables: 6 } },
    { name: 'Tres monitores 4K', price: 1500, monthly: 0, desc: 'Ves 8 mesas sin despeinarte.', effects: { comfortTables: 8 } },
  ],
  pc: [
    { name: 'Portátil viejo', price: 0, monthly: 0, desc: 'Se cuelga con más de 4 mesas.', effects: { maxTables: 4, handsMult: 1 } },
    { name: 'PC de sobremesa', price: 600, monthly: 0, desc: 'Hasta 6 mesas y menos esperas.', effects: { maxTables: 6, handsMult: 1.05 } },
    { name: 'PC gaming', price: 1800, monthly: 0, desc: 'Hasta 8 mesas, todo fluido.', effects: { maxTables: 8, handsMult: 1.1 } },
    { name: 'Workstation', price: 5000, monthly: 0, desc: 'Ni un segundo de lag.', effects: { maxTables: 8, handsMult: 1.15 } },
  ],
  software: [
    { name: 'Sin software', price: 0, monthly: 0, desc: 'Juegas a pelo.', effects: {} },
    { name: 'Tracker con HUD', price: 60, monthly: 0, desc: 'Estadísticas de los rivales en pantalla.', effects: { skillBonus: 2 } },
    { name: 'Tracker + HUD avanzado', price: 200, monthly: 5, desc: 'Popups y notas automáticas.', effects: { skillBonus: 4 } },
    { name: 'Tracker + solver', price: 450, monthly: 15, desc: 'Estudias con un solver GTO.', effects: { skillBonus: 5, studyMult: 1.3 } },
  ],
};

// ── Viviendas y gastos fijos ────────────────────────────────
export type HomeId = 'habitacion' | 'piso' | 'estudio' | 'atico';

export interface HomeConfig {
  id: HomeId;
  name: string;
  desc: string;
  /** Alquiler mensual (€) */
  rent: number;
  /** Comida al mes (€) */
  food: number;
  /** Internet, móvil y suscripciones básicas al mes (€) */
  bills: number;
  /** Gastos de mudanza y fianza al entrar (€, no se recuperan) */
  moveCost: number;
  /** Moral base de la vivienda */
  moral: number;
  /** Energía extra por semana (descansas mejor) */
  energyRecovery: number;
}

export const HOMES: HomeConfig[] = [
  { id: 'habitacion', name: 'Tu habitación', desc: 'En casa de tus padres. Pones algo para la comida.', rent: 0, food: 8, bills: 0, moveCost: 0, moral: 45, energyRecovery: 0 },
  { id: 'piso', name: 'Piso propio', desc: 'Un piso pequeño, pero tuyo.', rent: 550, food: 220, bills: 45, moveCost: 1100, moral: 65, energyRecovery: 4 },
  { id: 'estudio', name: 'Casa con estudio', desc: 'Un despacho solo para el póker.', rent: 1600, food: 320, bills: 70, moveCost: 3200, moral: 78, energyRecovery: 7 },
  { id: 'atico', name: 'Ático de lujo', desc: 'Vistas a la ciudad y jacuzzi.', rent: 4200, food: 600, bills: 120, moveCost: 8400, moral: 92, energyRecovery: 10 },
];

/** Meses de gastos que recomendamos tener aparte del bankroll de juego al mudarte */
export const MOVE_RECOMMENDED_MONTHS = 6;

// ── Bankroll ────────────────────────────────────────────────
export const START_BANKROLL = 50;
/** Buy-ins recomendados para jugar un límite */
export const RECOMMENDED_BUYINS = 30;
/** Fracción de lo aprendido (por encima del nivel inicial) que conservas al arruinarte */
export const BUST_SKILL_RETENTION = 0.7;

// ── Tiempo ──────────────────────────────────────────────────
export const WEEKS_PER_YEAR = 52;
export const GAME_YEARS = 10;
/** Duración en ms de una semana a velocidad x1 */
export const WEEK_DURATION_MS = 4000;

// ── Guardado ────────────────────────────────────────────────
export const SAVE_SLOTS = 3;
export const SAVE_KEY_PREFIX = 'poker-tycoon-slot-';
export const SAVE_VERSION = 3;

// ── Fama ────────────────────────────────────────────────────
/** fama = 8·log10(1+seguidores) + 4·(índice del límite máximo + 1) + 0,15·reputación + bonus escuela */
export const FAME_PER_LOG_FOLLOWERS = 8;
export const FAME_PER_LIMIT = 4;
export const FAME_PER_REPUTATION = 0.15;
export const FAME_SCHOOL_BONUS = 5;

// ── Streaming ───────────────────────────────────────────────
export type StreamGearId = 'micro' | 'camara' | 'luz';

export interface StreamGearItem {
  name: string;
  price: number;
  desc: string;
  /** Aporta a la calidad del directo */
  quality: number;
}

export const STREAM_GEAR_CATEGORIES: { id: StreamGearId; name: string }[] = [
  { id: 'micro', name: 'Micrófono' },
  { id: 'camara', name: 'Cámara' },
  { id: 'luz', name: 'Iluminación' },
];

export const STREAM_GEAR: Record<StreamGearId, StreamGearItem[]> = {
  micro: [
    { name: 'Sin micrófono', price: 0, desc: 'Nadie te oye.', quality: 0 },
    { name: 'Micro USB', price: 80, desc: 'Se te entiende… casi siempre.', quality: 1 },
    { name: 'Micro de estudio', price: 350, desc: 'Voz de locutor de radio.', quality: 2 },
  ],
  camara: [
    { name: 'Sin cámara', price: 0, desc: 'Solo se ven las mesas.', quality: 0 },
    { name: 'Webcam HD', price: 60, desc: 'Tu cara en una esquina.', quality: 1 },
    { name: 'Cámara réflex', price: 700, desc: 'Fondo desenfocado de profesional.', quality: 2 },
  ],
  luz: [
    { name: 'Lámpara de mesa', price: 0, desc: 'Sales con ojeras.', quality: 0 },
    { name: 'Aro de luz', price: 40, desc: 'Luz bonita y uniforme.', quality: 0.5 },
    { name: 'Kit de focos', price: 250, desc: 'Plató de televisión.', quality: 1 },
  ],
};

/** Se desbloquea al llegar a NL25 (índice 3) o con esta fama */
export const STREAM_UNLOCK_LIMIT_INDEX = 3;
export const STREAM_UNLOCK_FAME = 15;
/** Para emitir necesitas micro, cámara y un segundo monitor (nivel de monitores ≥ 1) */
export const STREAM_MIN_MONITORS = 1;
/** Puntos de habilidad que pierdes al jugar mientras hablas con el chat */
export const STREAM_SKILL_PENALTY = 3;
export const STREAM_ENERGY_MULT = 1.15;

/** Espectadores medios = (3 + 0,25·seguidores^0,6) · calidad · (1 + 0,15·índice del límite) */
export const VIEWERS_BASE = 3;
export const VIEWERS_FACTOR = 0.25;
export const VIEWERS_EXP = 0.6;
export const VIEWERS_PER_LIMIT = 0.15;
/** Calidad = 0,6 + 0,2 · suma de la calidad del equipo (1,0 con micro y webcam básicos) */
export const STREAM_QUALITY_BASE = 0.6;
export const STREAM_QUALITY_PER_POINT = 0.2;
/** Seguidores nuevos por espectador y hora */
export const FOLLOWS_PER_VIEWER_HOUR = 0.05;
/** Saturación: el crecimiento se frena según te acercas a este número de seguidores */
export const FOLLOWERS_SATURATION = 2_000_000;
export const STREAM_WIN_MULT = 1.2;
export const STREAM_LOSS_MULT = 0.85;
/** Clips virales */
export const VIRAL_BASE_CHANCE = 0.03;
export const VIRAL_CHANCE_PER_EVENT = 0.05;
export const VIRAL_MIN_FOLLOWERS = 150;
export const VIRAL_FOLLOWER_FRACTION = 0.05;
/** Si no emites, pierdes este % de seguidores por semana (a partir de la segunda semana sin directo) */
export const FOLLOWER_CHURN_IDLE = 0.01;
/** Suscriptores: tienden a este % de los seguidores cuando emites y bajan un 10 %/semana si no */
export const SUB_RATE = 0.012;
export const SUB_DRIFT = 0.25;
export const SUB_DECAY_IDLE = 0.1;
/** Lo que te llega de cada sub al mes (tras la comisión de la plataforma) */
export const SUB_PRICE_NET = 2.5;
export const DONATION_PER_VIEWER_HOUR = 0.04;
/** Patrocinios de marcas: a partir de estos seguidores, si emites al menos 10 h */
export const BRAND_SPONSOR_MIN_FOLLOWERS = 5000;
export const BRAND_SPONSOR_MIN_HOURS = 10;
export const BRAND_SPONSOR_PER_FOLLOWER_WEEK = 0.004;

// ── Coaching ────────────────────────────────────────────────
/** Se desbloquea con NL50 (índice 4) y esta fama */
export const COACH_UNLOCK_LIMIT_INDEX = 4;
export const COACH_UNLOCK_FAME = 25;
export const MIN_COACH_HOURS = 2;
export const MAX_COACH_HOURS = 40;
/** Tarifa €/h = 10 · 1,35^índice del límite máximo + 0,5 · reputación */
export const COACH_RATE_BASE = 10;
export const COACH_RATE_GROWTH = 1.35;
export const COACH_RATE_PER_REP = 0.5;
/** Horas que te piden los alumnos por semana = 3 + 0,25·fama + 0,2·reputación */
export const COACH_DEMAND_BASE = 3;
export const COACH_DEMAND_PER_FAME = 0.25;
export const COACH_DEMAND_PER_REP = 0.2;
export const COACH_ENERGY_PER_HOUR = 0.8;
/** Reputación por hora de clase = 0,15 · (habilidad / 50), con rendimientos decrecientes */
export const COACH_REP_PER_HOUR = 0.15;
/** Enseñar también te hace mejorar un poco (Preflop y Postflop) */
export const COACH_XP_PER_HOUR = 0.03;
/** Horas por alumno y semana (solo para mostrar cuántos alumnos tienes) */
export const COACH_HOURS_PER_STUDENT = 2;

// ── Escuela de póker ────────────────────────────────────────
export const SCHOOL_UNLOCK_REPUTATION = 40;
export const SCHOOL_UNLOCK_FAME = 40;
export const SCHOOL_OPEN_COST = 15000;
export const SCHOOL_PLATFORM_MONTHLY = 250;
/** Cuota mensual de cada miembro */
export const SCHOOL_MEMBERSHIP_PRICE = 30;
/** Miembros objetivo = 4·fama + 0,6·Σ habilidad de los coaches + 0,2·Σ calidad de los cursos */
export const SCHOOL_MEMBERS_PER_FAME = 4;
export const SCHOOL_MEMBERS_PER_COACH_SKILL = 0.6;
export const SCHOOL_MEMBERS_PER_COURSE_QUALITY = 0.2;
/** Cada semana los miembros se acercan este % al objetivo */
export const SCHOOL_MEMBERS_DRIFT = 0.1;
export const SCHOOL_MAX_COACHES = 5;
export const SCHOOL_CANDIDATES = 3;
/** Sueldo mensual de un coach = 30 € por punto de habilidad */
export const COACH_SALARY_PER_SKILL = 30;
export const COACH_SKILL_MIN = 40;
export const COACH_SKILL_MAX = 90;
/** Producir un curso */
export const COURSE_COST = 3000;
/** Calidad = 0,7·tu habilidad en el tema + 0,3·mejor coach especialista (o tu habilidad si no hay) */
export const COURSE_PLAYER_WEIGHT = 0.7;
/** Ventas por semana = (3 + 0,02·miembros + 0,00005·seguidores) · calidad/100 · novedad */
export const COURSE_BASE_SALES = 3;
export const COURSE_SALES_PER_MEMBER = 0.02;
export const COURSE_SALES_PER_FOLLOWER = 0.00005;
/** La novedad se reduce a la mitad cada 26 semanas (mínimo 10 %) */
export const COURSE_HALF_LIFE_WEEKS = 26;
export const COURSE_MIN_NOVELTY = 0.1;
export const COURSE_PLATFORM_FEE = 0.1;
