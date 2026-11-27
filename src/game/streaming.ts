import * as C from './config';
import type { LimitId, StreamGearId } from './config';
import { Rng } from './rng';
import { limitIndex } from './simulation';
import type { GameState, PlayOutcome, StreamGear, StreamOutcome, StreamState } from './types';

export const EMPTY_GEAR: StreamGear = { micro: 0, camara: 0, luz: 0 };

export function newStreamState(): StreamState {
  return {
    gear: { ...EMPTY_GEAR },
    subs: 0,
    hours: 0,
    incomeEur: 0,
    virals: 0,
    maxFollowers: 0,
    lastViewers: 0,
    weeksSinceStream: 0,
  };
}

/** Fama (0–100) a partir de seguidores, límite máximo, reputación y escuela */
export function computeFame(state: Pick<GameState, 'followers' | 'career' | 'coaching' | 'school'>): number {
  const f =
    C.FAME_PER_LOG_FOLLOWERS * Math.log10(1 + state.followers) +
    C.FAME_PER_LIMIT * (state.career.maxLimitIndex + 1) +
    C.FAME_PER_REPUTATION * state.coaching.reputation +
    (state.school.open ? C.FAME_SCHOOL_BONUS : 0);
  return Math.max(0, Math.min(100, f));
}

export function streamUnlocked(state: GameState): boolean {
  return state.career.maxLimitIndex >= C.STREAM_UNLOCK_LIMIT_INDEX || state.fame >= C.STREAM_UNLOCK_FAME;
}

/** Lo que falta para poder emitir (vacío = todo listo) */
export function streamMissing(state: GameState): string[] {
  const out: string[] = [];
  if (!streamUnlocked(state)) out.push(`Llegar a ${C.LIMITS[C.STREAM_UNLOCK_LIMIT_INDEX].id} o tener ${C.STREAM_UNLOCK_FAME} de fama`);
  if (state.stream.gear.micro < 1) out.push('Comprar un micrófono');
  if (state.stream.gear.camara < 1) out.push('Comprar una cámara');
  if (state.setup.monitores < C.STREAM_MIN_MONITORS) out.push('Tener un segundo monitor (Tienda)');
  return out;
}

export function streamQuality(gear: StreamGear): number {
  const pts = C.STREAM_GEAR_CATEGORIES.reduce((a, { id }) => a + C.STREAM_GEAR[id][gear[id]].quality, 0);
  return C.STREAM_QUALITY_BASE + C.STREAM_QUALITY_PER_POINT * pts;
}

export function expectedViewers(followers: number, gear: StreamGear, limit: LimitId): number {
  return (
    (C.VIEWERS_BASE + C.VIEWERS_FACTOR * Math.pow(Math.max(0, followers), C.VIEWERS_EXP)) *
    streamQuality(gear) *
    (1 + C.VIEWERS_PER_LIMIT * limitIndex(limit))
  );
}

export function nextGear(state: GameState, id: StreamGearId) {
  return C.STREAM_GEAR[id][state.stream.gear[id] + 1];
}

export function canBuyGear(state: GameState, id: StreamGearId): string | null {
  const next = nextGear(state, id);
  if (!next) return 'Ya tienes lo mejor.';
  if (state.bankroll < next.price) return 'No tienes suficiente dinero.';
  return null;
}

export function buyGear(state: GameState, id: StreamGearId): GameState {
  const err = canBuyGear(state, id);
  if (err) throw new Error(err);
  const next = nextGear(state, id)!;
  return {
    ...state,
    bankroll: state.bankroll - next.price,
    stream: { ...state.stream, gear: { ...state.stream.gear, [id]: state.stream.gear[id] + 1 } },
    career: { ...state.career, spentEur: state.career.spentEur + next.price },
  };
}

const VIRAL_CLIPS = {
  bad: [
    'El clip de tu bad beat se hace viral: «la peor mano de la historia».',
    'Tu cara al perder ese all-in se convierte en meme.',
  ],
  good: [
    '¡Tu hero call se hace viral! Todo el mundo comparte el clip.',
    'Un streamer famoso reacciona a tu jugada épica.',
  ],
  neutral: ['Un clip tuyo explicando una mano se comparte por todas partes.'],
};

/**
 * Semana de directo: espectadores, seguidores, subs, donaciones, patrocinios y clips virales.
 * Muta `s` (copia de trabajo de runWeek).
 */
export function applyStreamWeek(
  s: GameState,
  rng: Rng,
  hours: number,
  play: PlayOutcome,
  plannedHands: number,
): StreamOutcome {
  const st = { ...s.stream };
  const viewers = expectedViewers(s.followers, st.gear, play.limit) * (0.85 + rng.next() * 0.3);
  // Si cortaste la sesión, emitiste menos horas
  const effHours = plannedHands > 0 ? hours * Math.min(1, play.hands / plannedHands) : hours;
  const resultMult = play.netBB >= 0 ? C.STREAM_WIN_MULT : C.STREAM_LOSS_MULT;
  const saturation = Math.max(0, 1 - s.followers / C.FOLLOWERS_SATURATION);
  const newFollowers = Math.round(effHours * viewers * C.FOLLOWS_PER_VIEWER_HOUR * resultMult * saturation);

  // Clip viral: más probable si hubo un momento épico en la sesión
  const epic = play.events.filter((e) => e.kind === 'badbeat' || e.kind === 'cooler' || e.kind === 'herocall');
  const chance = C.VIRAL_BASE_CHANCE + C.VIRAL_CHANCE_PER_EVENT * epic.length;
  let viral: string | undefined;
  let viralFollowers = 0;
  if (rng.next() < chance) {
    const ev = epic.length ? epic[Math.floor(rng.next() * epic.length)] : undefined;
    const pool = !ev ? VIRAL_CLIPS.neutral : ev.kind === 'herocall' ? VIRAL_CLIPS.good : VIRAL_CLIPS.bad;
    viral = pool[Math.floor(rng.next() * pool.length)];
    viralFollowers = Math.round(Math.max(C.VIRAL_MIN_FOLLOWERS, (s.followers + newFollowers) * C.VIRAL_FOLLOWER_FRACTION));
    st.virals += 1;
  }

  s.followers += newFollowers + viralFollowers;
  const targetSubs = s.followers * C.SUB_RATE;
  st.subs += (targetSubs - st.subs) * C.SUB_DRIFT;

  const subsEur = (st.subs * C.SUB_PRICE_NET * 12) / C.WEEKS_PER_YEAR;
  const donationsEur = viewers * effHours * C.DONATION_PER_VIEWER_HOUR * (0.6 + rng.next() * 0.8);
  const sponsorEur =
    s.followers >= C.BRAND_SPONSOR_MIN_FOLLOWERS && effHours >= C.BRAND_SPONSOR_MIN_HOURS
      ? s.followers * C.BRAND_SPONSOR_PER_FOLLOWER_WEEK
      : 0;
  const totalEur = subsEur + donationsEur + sponsorEur;

  st.hours += effHours;
  st.incomeEur += totalEur;
  st.maxFollowers = Math.max(st.maxFollowers, s.followers);
  st.lastViewers = viewers;
  st.weeksSinceStream = 0;
  s.stream = st;
  s.bankroll += totalEur;

  return {
    viewers,
    newFollowers,
    churned: 0,
    viral,
    viralFollowers,
    subs: st.subs,
    subsEur,
    donationsEur,
    sponsorEur,
    totalEur,
  };
}

/** Semana sin directo: los subs siguen pagando pero bajan, y pierdes algún seguidor */
export function applyIdleStreamWeek(s: GameState): StreamOutcome | undefined {
  if (s.followers <= 0 && s.stream.subs <= 0) return undefined;
  const st = { ...s.stream };
  st.weeksSinceStream += 1;
  let churned = 0;
  if (st.weeksSinceStream >= 2) {
    churned = Math.round(s.followers * C.FOLLOWER_CHURN_IDLE);
    s.followers = Math.max(0, s.followers - churned);
  }
  const subsEur = (st.subs * C.SUB_PRICE_NET * 12) / C.WEEKS_PER_YEAR;
  st.subs *= 1 - C.SUB_DECAY_IDLE;
  st.incomeEur += subsEur;
  s.stream = st;
  s.bankroll += subsEur;
  return {
    viewers: 0,
    newFollowers: 0,
    churned,
    viralFollowers: 0,
    subs: st.subs,
    subsEur,
    donationsEur: 0,
    sponsorEur: 0,
    totalEur: subsEur,
  };
}
