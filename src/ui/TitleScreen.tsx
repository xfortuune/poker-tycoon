import { useState } from 'react';
import { calendar } from '../game/state';
import { useStore } from '../store';
import { eur } from './format';
import { useImport } from './SaveModal';

export default function TitleScreen() {
  const slots = useStore((s) => s.slots);
  const startNew = useStore((s) => s.startNew);
  const loadGame = useStore((s) => s.loadGame);
  const deleteGame = useStore((s) => s.deleteGame);
  const [importSlot, setImportSlot] = useState(0);
  const imp = useImport(importSlot);
  const [confirm, setConfirm] = useState<{ slot: number; kind: 'new' | 'delete' } | null>(null);

  return (
    <main className="title-screen">
      <div className="logo">
        <span className="logo-suit">♠</span>
        <h1>
          POKER
          <br />
          TYCOON
        </h1>
        <p className="tagline">De NL2 en tu habitación a leyenda de las high stakes</p>
      </div>

      <section className="slots">
        {slots.map((s) => {
          const cal = s.state ? calendar(s.state.week) : null;
          const asking = confirm?.slot === s.slot;
          return (
            <div key={s.slot} className="slot pixel-box">
              <div className="slot-info">
                <strong>Ranura {s.slot + 1}</strong>
                {s.state && cal ? (
                  <span>
                    Año {cal.year}, sem {cal.week} · {eur(s.state.bankroll)}
                  </span>
                ) : (
                  <span className="muted">Vacía</span>
                )}
              </div>
              {asking ? (
                <div className="slot-actions">
                  <span className="warning-inline">
                    {confirm!.kind === 'new' ? '¿Sobrescribir la partida?' : '¿Borrar la partida?'}
                  </span>
                  <button
                    className="btn danger small"
                    onClick={() => {
                      if (confirm!.kind === 'new') startNew(s.slot);
                      else deleteGame(s.slot);
                      setConfirm(null);
                    }}
                  >
                    Sí
                  </button>
                  <button className="btn small" onClick={() => setConfirm(null)}>
                    No
                  </button>
                </div>
              ) : (
                <div className="slot-actions">
                  {s.state && (
                    <button className="btn primary small" onClick={() => loadGame(s.slot)}>
                      Continuar
                    </button>
                  )}
                  <button
                    className="btn small"
                    onClick={() => (s.state ? setConfirm({ slot: s.slot, kind: 'new' }) : startNew(s.slot))}
                  >
                    Nueva
                  </button>
                  <button
                    className="btn small"
                    onClick={() => {
                      setImportSlot(s.slot);
                      setTimeout(imp.open, 0);
                    }}
                  >
                    Importar
                  </button>
                  {s.state && (
                    <button className="btn small danger" onClick={() => setConfirm({ slot: s.slot, kind: 'delete' })}>
                      Borrar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {imp.input}
      </section>
      <footer className="credits">Juego de simulación. Ninguna sala de póker real está asociada.</footer>
    </main>
  );
}
