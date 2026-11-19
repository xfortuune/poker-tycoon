import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
}

export default function Modal({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal pixel-box ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
