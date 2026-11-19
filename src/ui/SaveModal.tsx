import { useRef } from 'react';
import { calendar } from '../game/state';
import { useStore } from '../store';
import { eur } from './format';
import Modal from './Modal';

export function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useImport(slot: number) {
  const importGame = useStore((s) => s.importGame);
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="application/json,.json"
      hidden
      onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) importGame(await f.text(), slot);
        e.target.value = '';
      }}
    />
  );
  return { input, open: () => ref.current?.click() };
}

export default function SaveModal() {
  const game = useStore((s) => s.game)!;
  const slot = useStore((s) => s.slot);
  const exportGame = useStore((s) => s.exportGame);
  const saveNow = useStore((s) => s.saveNow);
  const toTitle = useStore((s) => s.toTitle);
  const openModal = useStore((s) => s.openModal);
  const toast = useStore((s) => s.toast);
  const imp = useImport(slot);
  const cal = calendar(game.week);

  return (
    <Modal title="Partida" onClose={() => openModal(null)}>
      <p>
        Ranura {slot + 1} · Año {cal.year}, semana {cal.week} · {eur(game.bankroll)}
      </p>
      <p className="muted small">La partida se guarda sola al final de cada semana.</p>
      <div className="menu-list">
        <button
          className="btn"
          onClick={() => {
            saveNow();
            toast('Partida guardada.', 'good');
          }}
        >
          💾 Guardar ahora
        </button>
        <button
          className="btn"
          onClick={() => {
            const json = exportGame();
            if (json) downloadJson(`poker-tycoon-ranura${slot + 1}-año${cal.year}-sem${cal.week}.json`, json);
          }}
        >
          ⬇ Exportar partida (JSON)
        </button>
        <button className="btn" onClick={imp.open}>
          ⬆ Importar partida en esta ranura
        </button>
        {imp.input}
        <button className="btn danger" onClick={toTitle}>
          ⏏ Volver al menú principal
        </button>
      </div>
    </Modal>
  );
}
