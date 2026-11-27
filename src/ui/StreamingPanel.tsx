import * as C from '../game/config';
import { buyGear, canBuyGear, expectedViewers, nextGear, streamMissing, streamQuality } from '../game/streaming';
import { useStore } from '../store';
import { d1, eur, num } from './format';
import Modal from './Modal';

const ICONS: Record<C.StreamGearId, string> = { micro: '🎙️', camara: '📷', luz: '💡' };

export default function StreamingPanel() {
  const game = useStore((s) => s.game)!;
  const openModal = useStore((s) => s.openModal);
  const apply = useStore((s) => s.apply);
  const st = game.stream;
  const missing = streamMissing(game);
  const lastLimit = game.sessions[game.sessions.length - 1]?.limit ?? 'NL2';
  const subsMonthly = st.subs * C.SUB_PRICE_NET;

  return (
    <Modal title="Streaming" onClose={() => openModal(null)} wide>
      {missing.length > 0 ? (
        <div className="unlock-box">
          <strong>🔒 Para empezar a emitir te falta:</strong>
          <ul>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="pos">✓ Todo listo para emitir. Usa la acción «Streamear».</p>
      )}

      <div className="summary-grid">
        <div className="kpi">
          <span>Seguidores</span>
          <strong>{num(game.followers)}</strong>
        </div>
        <div className="kpi">
          <span>Suscriptores</span>
          <strong>{num(st.subs)}</strong>
        </div>
        <div className="kpi">
          <span>Subs al mes</span>
          <strong className="pos">{eur(subsMonthly)}</strong>
        </div>
        <div className="kpi">
          <span>Espectadores (último directo)</span>
          <strong>{num(st.lastViewers)}</strong>
        </div>
        <div className="kpi">
          <span>Horas emitidas</span>
          <strong>{num(st.hours)}</strong>
        </div>
        <div className="kpi">
          <span>Ingresos totales</span>
          <strong className="pos">{eur(st.incomeEur)}</strong>
        </div>
      </div>
      <p className="muted small">
        Fama: <strong className="gold">{d1(game.fame)}</strong> · Calidad del directo ×{d1(streamQuality(st.gear))} ·
        Espectadores estimados en {lastLimit}: ~{num(expectedViewers(game.followers, st.gear, lastLimit))} · Clips virales:{' '}
        {st.virals}
        {game.followers >= C.BRAND_SPONSOR_MIN_FOLLOWERS
          ? ' · Tienes patrocinios de marcas si emites 10 h o más.'
          : ` · Con ${num(C.BRAND_SPONSOR_MIN_FOLLOWERS)} seguidores llegan los patrocinios de marcas.`}
      </p>

      <h3>Equipo de streaming</h3>
      <div className="shop-list">
        {C.STREAM_GEAR_CATEGORIES.map(({ id, name }) => {
          const cur = C.STREAM_GEAR[id][st.gear[id]];
          const next = nextGear(game, id);
          const err = canBuyGear(game, id);
          return (
            <div key={id} className="shop-item">
              <div className="shop-icon">{ICONS[id]}</div>
              <div className="shop-main">
                <span className="shop-cat">{name}</span>
                <strong>{cur.name}</strong>
                <span className="muted small">{cur.desc}</span>
                {next && (
                  <div className="shop-next">
                    <span>
                      Siguiente: <strong>{next.name}</strong> — {next.desc}
                    </span>
                    <span className="pos small">+{d1(next.quality - cur.quality)} de calidad del directo</span>
                  </div>
                )}
              </div>
              <div className="shop-buy">
                {next ? (
                  <button
                    className="btn primary small"
                    disabled={!!err}
                    title={err ?? undefined}
                    onClick={() => apply((g) => buyGear(g, id), `Has comprado: ${next.name}.`)}
                  >
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
      <p className="muted small">
        Más seguidores → más espectadores. Ganar en directo atrae más gente, y los bad beats o hero calls pueden hacerse
        virales. Si dejas de emitir, pierdes seguidores y subs poco a poco.
      </p>
    </Modal>
  );
}
