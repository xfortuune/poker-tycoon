import * as C from './config';
import type { LimitId } from './config';
import { getLimit } from './simulation';
import type { GameState, SessionRecord } from './types';

export type GraphUnit = 'eur' | 'bb';
export type GraphPeriod = 'todo' | 'año' | '12sem';

export interface GraphPoint {
  hands: number;
  net: number;
  sd: number;
  nsd: number;
}

export function filterSessions(state: GameState, limit: LimitId | 'todos', period: GraphPeriod): SessionRecord[] {
  const minWeek =
    period === 'todo' ? -Infinity : period === 'año' ? state.week - C.WEEKS_PER_YEAR : state.week - 12;
  return state.sessions.filter((s) => (limit === 'todos' || s.limit === limit) && s.week >= minWeek);
}

/** Serie acumulada para la gráfica: neto, showdown y non-showdown */
export function buildGraph(sessions: SessionRecord[], unit: GraphUnit): GraphPoint[] {
  const pts: GraphPoint[] = [{ hands: 0, net: 0, sd: 0, nsd: 0 }];
  let h = 0;
  let net = 0;
  let sd = 0;
  for (const s of sessions) {
    const k = unit === 'eur' ? getLimit(s.limit).bb : 1;
    for (const [hands, n, d] of s.curve) {
      pts.push({ hands: h + hands, net: net + n * k, sd: sd + d * k, nsd: net + n * k - (sd + d * k) });
    }
    h += s.hands;
    net += s.netBB * k;
    sd += s.sdBB * k;
  }
  return pts;
}

/** Mayor downswing (desde pico) de una serie */
export function maxDrawdown(values: number[]): number {
  let peak = -Infinity;
  let dd = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    dd = Math.max(dd, peak - v);
  }
  return Math.max(0, dd);
}

export function bb100(netBB: number, hands: number): number {
  return hands > 0 ? (netBB / hands) * 100 : 0;
}
