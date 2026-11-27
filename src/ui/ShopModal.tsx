import { useState } from 'react';
import * as C from '../game/config';
import type { HomeId, UpgradeEffects } from '../game/config';
import {
  canBuy,
  canMove,
  currentItem,
  getHome,
  homeIndex,
  isMonthEnd,
  monthlyExpenses,
  moveRecommendation,
  nextItem,
  weeklyRecovery,
} from '../game/setup';
import { buyinEur } from '../game/simulation';
import { useStore } from '../store';
import { d1, eur } from './format';
import Modal from './Modal';

type Tab = 'mejoras' | 'vivienda' | 'gastos';

const ICONS: Record<C.UpgradeCategory, string> = { silla: '🪑', monitores: '🖥️', pc: '💻', software: '📊' };

export function describeEffects(fx: UpgradeEffects): string[] {
  const out: string[] = [];
  if (fx.comfortTables) out.push(`${fx.comfortTables} mesas sin penalización`);
  if (fx.maxTables) out.push(`Hasta ${fx.maxTables} mesas`);
  if (fx.handsMult && fx.handsMult !== 1) out.push(`+${Math.round((fx.handsMult - 1) * 100)} % manos por hora`);
  if (fx.energyCostMult && fx.energyCostMult !== 1) {
    const p = Math.round((fx.energyCostMult - 1) * 100);
    out.push(p > 0 ? `Cansa un ${p} % más` : `Cansa un ${-p} % menos`);
  }
  if (fx.energyRecovery) out.push(`+${fx.energyRecovery} energía por semana`);
  if (fx.skillBonus) out.push(`+${fx.skillBonus} de habilidad en mesa`);
  if (fx.studyMult && fx.studyMult !== 1) out.push(`Estudias un ${Math.round((fx.studyMult - 1) * 100)} % más rápido`);
  return out;
}

function weeksToMonthEnd(week: number): number {
  let k = 0;
  while (!isMonthEnd(week + k)) k++;
  return k;
}

export default function ShopModal() {
  const game = useStore((s) => s.game)!;
  const openModal = useStore((s) => s.openModal);
  const buy = useStore((s) => s.buy);
  const move = useStore((s) => s.move);
  const [tab, setTab] = useState<Tab>('mejoras');
  const [confirmMove, setConfirmMove] = useState<HomeId | null>(null);

  const exp = monthlyExpenses(game);
  const lastLimit = game.sessions[game.sessions.length - 1]?.limit ?? 'NL2';
  const toMonthEnd = weeksToMonthEnd(game.week);

  return (
    <Modal title="Tienda y vida" onClose={() => openModal(null)} wide>
      <div className="tabs" role="tablist">
        {(
          [
            ['mejoras', '🛒 Setup'],
            ['vivienda', '🏠 Vivienda'],
            ['gastos', '🧾 Gastos'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted small">
        Bankroll: <strong className="gold">{eur(game.bankroll)}</strong>. Todo se paga del bankroll: cuida tus buy-ins.
      </p>

      {tab === 'mejoras' && (
        <div className="shop-list">
          {C.UPGRADE_CATEGORIES.map(({ id, name }) => {
            const cur = currentItem(game.setup, id);
            const next = nextItem(game.setup, id);
            const err = canBuy(game, id);
            return (
              <div key={id} className="shop-item">
                <div className="shop-icon">{ICONS[id]}</div>
                <div className="shop-main">
                  <span className="shop-cat">{name}</span>
                  <strong>{cur.name}</strong>
                  <span className="muted small">{describeEffects(cur.effects).join(' · ') || cur.desc}</span>
                  {next && (
                    <div className="shop-next">
                      <span>
                        Siguiente: <strong>{next.name}</strong> — {next.desc}
                      </span>
                      <span className="pos small">{describeEffects(next.effects).join(' · ')}</span>
                      {next.monthly > 0 && <span className="neg small">Suscripción: {eur(next.monthly)}/mes</span>}
                    </div>
                  )}
                </div>
                <div className="shop-buy">
                  {next ? (
                    <button className="btn primary small" disabled={!!err} title={err ?? undefined} onClick={() => buy(id)}>
                      {eur(next.price)}
                    </button>
                  ) : (
                    <span className="gold small">Al máximo ✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'vivienda' && (
        <div className="shop-list">
          {C.HOMES.map((h) => {
            const here = h.id === game.home;
            const err = canMove(game, h.id);
            const hExp = monthlyExpenses({ home: h.id, setup: game.setup }).total;
            const rec = moveRecommendation(game, h.id, buyinEur(lastLimit));
            const better = homeIndex(h.id) > homeIndex(game.home);
            return (
              <div key={h.id} className={`shop-item ${here ? 'current' : ''}`}>
                <div className="shop-icon">{['🛏️', '🏢', '🎙️', '🌆'][homeIndex(h.id)]}</div>
                <div className="shop-main">
                  <strong>
                    {h.name} {here && <span className="gold small">· vives aquí</span>}
                  </strong>
                  <span className="muted small">{h.desc}</span>
                  <span className="small">
                    Gastos: <strong className="neg">{eur(hExp)}/mes</strong> · Moral base {h.moral} · +{h.energyRecovery} energía/semana
                  </span>
                  {!here && better && game.bankroll < rec && (
                    <span className="warning-inline small">
                      ⚠ Recomendado tener {eur(rec)}: mudanza + {C.MOVE_RECOMMENDED_MONTHS} meses de gastos + {C.RECOMMENDED_BUYINS} buy-ins.
                    </span>
                  )}
                </div>
                <div className="shop-buy">
                  {here ? null : confirmMove === h.id ? (
                    <div className="confirm">
                      <span className="small">Pagas {eur(h.moveCost)}</span>
                      <button
                        className="btn primary small"
                        onClick={() => {
                          move(h.id);
                          setConfirmMove(null);
                        }}
                      >
                        Confirmar
                      </button>
                      <button className="btn small" onClick={() => setConfirmMove(null)}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button className="btn small" disabled={!!err} title={err ?? undefined} onClick={() => setConfirmMove(h.id)}>
                      {h.moveCost > 0 ? `Mudarse · ${eur(h.moveCost)}` : 'Volver'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'gastos' && (
        <div>
          <table className="stats-table">
            <tbody>
              <tr>
                <td>Alquiler ({getHome(game.home).name})</td>
                <td>{eur(exp.rent)}</td>
              </tr>
              <tr>
                <td>Comida</td>
                <td>{eur(exp.food)}</td>
              </tr>
              <tr>
                <td>Internet y móvil</td>
                <td>{eur(exp.bills)}</td>
              </tr>
              <tr>
                <td>Suscripciones de software</td>
                <td>{eur(exp.subscriptions)}</td>
              </tr>
              <tr className="total-row">
                <td>Total al mes</td>
                <td className="neg">{eur(exp.total)}</td>
              </tr>
            </tbody>
          </table>
          <p>
            Próximo pago:{' '}
            <strong>{toMonthEnd === 0 ? 'al terminar esta semana' : `en ${toMonthEnd + 1} semanas`}</strong>.
            {exp.total > 0 && (
              <>
                {' '}
                Con tu bankroll cubres <strong>{d1(game.bankroll / exp.total)}</strong> meses de gastos.
              </>
            )}
          </p>
          <p className="muted small">
            Energía que recuperas cada semana: +{Math.round(weeklyRecovery(game))} (base {C.WEEKLY_ENERGY_RECOVERY}, vivienda, silla y moral).
            Gastado en mejoras y mudanzas: {eur(game.career.spentEur)}. Gastos fijos pagados: {eur(game.career.expensesEur)}.
          </p>
        </div>
      )}
    </Modal>
  );
}
