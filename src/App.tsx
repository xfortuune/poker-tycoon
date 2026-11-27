import { useEffect, useRef, useState } from 'react';
import * as C from './game/config';
import { useStore } from './store';
import { coachMissing, coachUnlocked } from './game/coaching';
import { streamMissing } from './game/streaming';
import CoachModal from './ui/CoachModal';
import { num, signedEur } from './ui/format';
import SchoolPanel from './ui/SchoolPanel';
import StreamingPanel from './ui/StreamingPanel';
import GraphModal from './ui/GraphModal';
import { activityLabel } from './ui/live';
import Modal from './ui/Modal';
import PlayModal from './ui/PlayModal';
import SaveModal from './ui/SaveModal';
import ShopModal from './ui/ShopModal';
import { getHome, weeklyRecovery } from './game/setup';
import Scene, { HEAD_POS } from './ui/Scene';
import StatsModal from './ui/StatsModal';
import StudyModal from './ui/StudyModal';
import SummaryModal from './ui/SummaryModal';
import TitleScreen from './ui/TitleScreen';
import Toasts from './ui/Toasts';
import TopBar from './ui/TopBar';

function useTicker() {
  const tick = useStore((s) => s.tick);
  const running = useStore((s) => !!s.running);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      tick(t - last);
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, tick]);
}

function RestModal() {
  const doAction = useStore((s) => s.doAction);
  const openModal = useStore((s) => s.openModal);
  const game = useStore((s) => s.game)!;
  const restGain = C.REST_ENERGY + weeklyRecovery(game) - C.WEEKLY_ENERGY_RECOVERY;
  return (
    <Modal title="Descansar" onClose={() => openModal(null)}>
      <p>
        Una semana sin mesas: recuperas <strong>+{Math.round(restGain)}</strong> de energía, el tilt baja{' '}
        <strong>{C.REST_TILT}+</strong> puntos y sube la moral.
      </p>
      <p className="muted">
        Energía {Math.round(game.energy)} → {Math.min(100, Math.round(game.energy + restGain))}
      </p>
      <div className="modal-actions">
        <button className="btn" onClick={() => openModal(null)}>
          Cancelar
        </button>
        <button className="btn primary" onClick={() => doAction({ type: 'rest' })}>
          Descansar
        </button>
      </div>
    </Modal>
  );
}

/** Bocadillo de emoción y dinero flotante tras cada semana */
function SceneOverlay() {
  const summary = useStore((s) => s.summary);
  const running = useStore((s) => s.running);
  const game = useStore((s) => s.game)!;
  const [float, setFloat] = useState<{ key: number; text: string; pos: boolean } | null>(null);
  const lastSummary = useRef(summary);

  useEffect(() => {
    if (summary && summary !== lastSummary.current && summary.play) {
      setFloat({ key: Date.now(), text: signedEur(summary.play.netEur), pos: summary.play.netEur >= 0 });
    }
    lastSummary.current = summary;
  }, [summary]);

  let emote = '';
  if (running) {
    const p = running.result.play;
    if (p) {
      const idx = Math.floor(running.progress * p.curveEur.length);
      const cur = p.curveEur[Math.min(idx, p.curveEur.length - 1)] ?? 0;
      const bi = (p.curveEur.length ? cur : 0) / (C.LIMITS.find((l) => l.id === p.limit)!.bb * C.BUYIN_BB);
      const handsNow = running.progress * p.hands;
      const recent = [...p.events].reverse().find((e) => e.hand <= handsNow && handsNow - e.hand < p.hands * 0.08);
      if (recent) emote = recent.kind === 'herocall' ? '😎' : recent.kind === 'exhausted' ? '😴' : '😤';
      else emote = bi <= -3 ? '😤' : bi >= 3 ? '😎' : '';
    } else if (running.result.action.type === 'study') emote = '🤓';
    else if (running.result.action.type === 'coach') emote = '🗣️';
  } else if (game.tilt >= 50) emote = '😤';
  else if (game.energy < 25) emote = '🥱';

  return (
    <>
      {emote && (
        <div className="bubble" style={{ left: `${HEAD_POS.x}%`, top: `${HEAD_POS.y}%` }}>
          {emote}
        </div>
      )}
      {float && (
        <div
          key={float.key}
          className={`float-money ${float.pos ? 'pos' : 'neg'}`}
          style={{ left: `${HEAD_POS.x + 12}%`, top: `${HEAD_POS.y}%` }}
          onAnimationEnd={() => setFloat(null)}
        >
          {float.pos ? '🪙 ' : '💸 '}
          {float.text}
        </div>
      )}
    </>
  );
}

function GameScreen() {
  useTicker();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const modal = useStore((s) => s.modal);
  const summary = useStore((s) => s.summary);
  const openModal = useStore((s) => s.openModal);
  const game = useStore((s) => s.game)!;

  const action = running?.result.action;
  const activity = !action ? 'idle' : action.type;
  const tables = action?.type === 'play' || action?.type === 'stream' ? action.tables : 0;
  const busy = !!running;
  const streamLocks = streamMissing(game);
  const canCoach = coachUnlocked(game);

  return (
    <div className="game">
      <TopBar />
      <main className="stage">
        <div className="scene pixel-box">
          <Scene
            activity={activity}
            tables={tables}
            home={game.home}
            setup={game.setup}
            gear={game.stream.gear}
            schoolOpen={game.school.open}
          />
          <SceneOverlay />
          {running && action?.type === 'stream' && (
            <div className="live-badge">
              <span className="live-dot" /> EN DIRECTO · {num(running.result.stream?.viewers ?? 0)} 👀
            </div>
          )}
          <div className="scene-label">{getHome(game.home).name}</div>
          {running && (
            <div className="progress">
              <span>
                {activityLabel(running.result)}… {paused && '(pausa)'}
              </span>
              <div className="bar bar-progress">
                <div style={{ width: `${Math.round(running.progress * 100)}%` }} />
              </div>
            </div>
          )}
          {!running && game.week < 3 && !summary && !modal && (
            <div className="tip">
              {game.week === 0
                ? '👋 Elige qué haces esta semana. Empieza jugando NL2 o estudiando.'
                : game.week === 1
                  ? '💡 Consejo: vigila la energía y descansa antes de que baje de 50.'
                  : '🛒 En la Tienda puedes mejorar tu setup y ver tus gastos del mes.'}
            </div>
          )}
        </div>

        <nav className="actions">
          <button className="action-btn play" disabled={busy} onClick={() => openModal('play')}>
            <span className="ico">🃏</span>Jugar
          </button>
          <button className="action-btn study" disabled={busy} onClick={() => openModal('study')}>
            <span className="ico">📚</span>Estudiar
          </button>
          <button className="action-btn rest" disabled={busy} onClick={() => openModal('rest')}>
            <span className="ico">🛏️</span>Descansar
          </button>
          <button
            className={`action-btn stream ${streamLocks.length ? 'locked' : ''}`}
            disabled={busy}
            title={streamLocks.length ? `Te falta: ${streamLocks.join(', ')}` : 'Juega en directo'}
            onClick={() => openModal(streamLocks.length ? 'streaming' : 'stream')}
          >
            <span className="ico">{streamLocks.length ? '🔒' : '🔴'}</span>Streamear
          </button>
          <button
            className={`action-btn coach ${canCoach ? '' : 'locked'}`}
            disabled={busy}
            title={canCoach ? 'Da clases particulares' : `Te falta: ${coachMissing(game).join(', ')}`}
            onClick={() => openModal(canCoach ? 'coach' : 'school')}
          >
            <span className="ico">{canCoach ? '🧑‍🏫' : '🔒'}</span>Coaching
          </button>
        </nav>

        <nav className="panels">
          <button className="panel-btn" disabled={busy} onClick={() => openModal('stats')}>
            📊 Estadísticas
          </button>
          <button className="panel-btn" disabled={busy} onClick={() => openModal('graph')}>
            📈 Gráfica
          </button>
          <button className="panel-btn" disabled={busy} onClick={() => openModal('shop')}>
            🛒 Tienda
          </button>
          <button className="panel-btn" disabled={busy} onClick={() => openModal('streaming')}>
            🎥 Streaming
          </button>
          <button className="panel-btn" disabled={busy} onClick={() => openModal('school')}>
            🏫 Escuela
          </button>
          <button className="panel-btn" disabled={busy} onClick={() => openModal('save')}>
            💾 Partida
          </button>
        </nav>
      </main>

      {modal === 'play' && <PlayModal />}
      {modal === 'stream' && <PlayModal mode="stream" />}
      {modal === 'coach' && <CoachModal />}
      {modal === 'streaming' && <StreamingPanel />}
      {modal === 'school' && <SchoolPanel />}
      {modal === 'study' && <StudyModal />}
      {modal === 'rest' && <RestModal />}
      {modal === 'stats' && <StatsModal />}
      {modal === 'graph' && <GraphModal />}
      {modal === 'save' && <SaveModal />}
      {modal === 'shop' && <ShopModal />}
      {summary && !modal && <SummaryModal />}
    </div>
  );
}

export default function App() {
  const screen = useStore((s) => s.screen);
  return (
    <>
      {screen === 'title' ? <TitleScreen /> : <GameScreen />}
      <Toasts />
    </>
  );
}
