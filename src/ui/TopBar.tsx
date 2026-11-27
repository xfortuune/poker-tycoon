import { calendar } from '../game/state';
import { useStore, type Speed } from '../store';
import { eur, num } from './format';
import { liveBankroll, liveTilt } from './live';

function Meter({ label, value, kind }: { label: string; value: number; kind: 'energy' | 'tilt' | 'moral' }) {
  const v = Math.round(value);
  return (
    <div className="stat meter" title={`${label}: ${v}/100`}>
      <span className="stat-label">{label}</span>
      <div className={`bar bar-${kind}`}>
        <div style={{ width: `${v}%` }} />
      </div>
      <span className="stat-small">{v}</span>
    </div>
  );
}

const SPEEDS: Speed[] = [1, 2, 4];

export default function TopBar() {
  const game = useStore((s) => s.game)!;
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const speed = useStore((s) => s.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  const togglePause = useStore((s) => s.togglePause);
  const openModal = useStore((s) => s.openModal);

  const cal = calendar(game.week);
  const bankroll = running ? liveBankroll(running.result, running.progress) : game.bankroll;
  const tilt = running ? liveTilt(running.result, running.progress) : game.tilt;
  const delta = running ? bankroll - running.result.before.bankroll : 0;

  return (
    <header className="topbar pixel-box">
      <div className="stat">
        <span className="stat-label">Fecha</span>
        <span className="stat-value">
          Año {cal.year} · Sem {cal.week}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Bankroll</span>
        <span className="stat-value gold">
          {eur(bankroll)}
          {running && Math.abs(delta) > 0.005 && (
            <small className={delta > 0 ? 'pos' : 'neg'}> {delta > 0 ? '▲' : '▼'}</small>
          )}
        </span>
      </div>
      <Meter label="Energía" value={game.energy} kind="energy" />
      <Meter label="Tilt" value={tilt} kind="tilt" />
      <Meter label="Moral" value={game.moral} kind="moral" />
      <div className="stat">
        <span className="stat-label">Seguidores</span>
        <span className="stat-value">{num(game.followers)}</span>
      </div>
      <div className="stat" title="Fama: sube con tus seguidores, el límite más alto que has jugado y tu reputación como coach">
        <span className="stat-label">Fama</span>
        <span className="stat-value gold">{Math.floor(game.fame)}</span>
      </div>
      <div className="speed" role="group" aria-label="Velocidad">
        <button className={`speed-btn ${paused ? 'on' : ''}`} onClick={togglePause} aria-label="Pausa" title="Pausa">
          ❚❚
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`speed-btn ${!paused && speed === s ? 'on' : ''}`}
            onClick={() => setSpeed(s)}
            title={`Velocidad x${s}`}
          >
            x{s}
          </button>
        ))}
        <button className="speed-btn" onClick={() => openModal('save')} title="Partida" aria-label="Menú de partida">
          ☰
        </button>
      </div>
    </header>
  );
}
