import type { WeekResult } from '../game/types';

/** Bankroll mostrado mientras la semana "transcurre" (animación de la sesión) */
export function liveBankroll(r: WeekResult, progress: number): number {
  if (progress >= 1) return r.after.bankroll;
  if (!r.play || r.play.curveEur.length === 0) return r.before.bankroll;
  const c = r.play.curveEur;
  const idx = Math.min(c.length - 1, Math.floor(progress * c.length));
  return r.before.bankroll + c[idx];
}

export function activityLabel(r: WeekResult): string {
  const a = r.action;
  if (a.type === 'play') return `Jugando ${a.limit} · ${a.tables} mesa${a.tables > 1 ? 's' : ''}`;
  if (a.type === 'study') return 'Estudiando';
  return 'Descansando';
}

/** Tilt mostrado durante la sesión: sube con cada evento según avanza la animación */
export function liveTilt(r: WeekResult, progress: number): number {
  if (progress >= 1 || !r.play) return progress >= 1 ? r.after.tilt : r.before.tilt;
  const handsNow = progress * r.play.hands;
  let t = r.before.tilt;
  for (const ev of r.play.events) if (ev.hand <= handsNow) t += ev.tiltDelta;
  return Math.max(0, Math.min(100, t));
}
