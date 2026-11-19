import { useEffect, useRef } from 'react';
import { drawSprite, PLAYER, SPADE } from './sprites';

export const SCENE_W = 192;
export const SCENE_H = 108;

/** Posición de la cabeza del personaje, en % del escenario (para bocadillos) */
export const HEAD_POS = { x: (104 / SCENE_W) * 100, y: (70 / SCENE_H) * 100 };

type Activity = 'idle' | 'play' | 'study' | 'rest';

interface Props {
  activity: Activity;
  tables: number;
}

// Estrellas fijas de la ventana
const STARS = [
  [18, 16], [24, 30], [31, 19], [40, 36], [47, 27], [21, 40], [35, 14], [50, 41], [28, 24],
];

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawRoom(ctx: CanvasRenderingContext2D, t: number) {
  // Pared
  rect(ctx, '#2b4a3c', 0, 0, SCENE_W, 80);
  for (let x = 4; x < SCENE_W; x += 8) rect(ctx, '#2f5143', x, 0, 2, 72);
  // Zócalo de madera
  rect(ctx, '#6b4226', 0, 72, SCENE_W, 8);
  rect(ctx, '#8a5a34', 0, 72, SCENE_W, 1);
  // Suelo
  rect(ctx, '#7a4e2d', 0, 80, SCENE_W, 28);
  for (let y = 84; y < SCENE_H; y += 6) {
    rect(ctx, '#6a4227', 0, y, SCENE_W, 1);
    const off = (y / 6) % 2 === 0 ? 0 : 20;
    for (let x = off; x < SCENE_W; x += 40) rect(ctx, '#6a4227', x, y - 5, 1, 5);
  }
  // Alfombra
  rect(ctx, '#c9a227', 58, 98, 94, 7);
  rect(ctx, '#8c2f2f', 59, 99, 92, 5);

  // Ventana nocturna
  rect(ctx, '#6b4226', 12, 10, 44, 38);
  rect(ctx, '#0d1b3d', 14, 12, 40, 34);
  for (const [i, [sx, sy]] of STARS.entries()) {
    const blink = Math.sin(t / 600 + i * 1.7) > 0.6;
    rect(ctx, blink ? '#fff7c2' : '#9fb3d9', sx, sy, 1, 1);
  }
  rect(ctx, '#f5e6a8', 43, 17, 5, 5);
  rect(ctx, '#f5e6a8', 42, 18, 7, 3);
  rect(ctx, '#0d1b3d', 45, 17, 3, 3);
  rect(ctx, '#6b4226', 33, 12, 2, 34);
  rect(ctx, '#6b4226', 14, 28, 40, 2);
  rect(ctx, '#8a5a34', 10, 47, 48, 2);

  // Póster de la sala ficticia
  rect(ctx, '#e8c547', 138, 12, 24, 30);
  rect(ctx, '#0f3d2a', 139, 13, 22, 28);
  drawSprite(ctx, SPADE, 147, 18, { x: '#e8c547' });
  rect(ctx, '#e8c547', 143, 30, 14, 1);
  rect(ctx, '#c0392b', 145, 33, 10, 1);
  rect(ctx, '#e8c547', 144, 36, 12, 1);

  // Estantería pequeña
  rect(ctx, '#6b4226', 66, 30, 26, 2);
  rect(ctx, '#c0392b', 68, 22, 3, 8);
  rect(ctx, '#e8c547', 71, 23, 3, 7);
  rect(ctx, '#2f4b7c', 74, 21, 3, 9);
  rect(ctx, '#e9e9e9', 78, 24, 2, 6);
  rect(ctx, '#1f7a4a', 84, 26, 6, 4);
  rect(ctx, '#e8c547', 86, 24, 2, 2);

  // Cama
  rect(ctx, '#5a3820', 0, 66, 4, 32);
  rect(ctx, '#e9e9e9', 4, 84, 44, 8);
  rect(ctx, '#f8f8f8', 5, 80, 10, 5);
  rect(ctx, '#1f6b4a', 14, 81, 34, 11);
  rect(ctx, '#18573c', 14, 90, 34, 2);
  rect(ctx, '#5a3820', 4, 92, 44, 3);
  rect(ctx, '#5a3820', 5, 95, 3, 3);
  rect(ctx, '#5a3820', 44, 95, 3, 3);
}

function drawDesk(ctx: CanvasRenderingContext2D, activity: Activity, tables: number, t: number) {
  // Mesa
  rect(ctx, '#8a5a34', 112, 84, 66, 4);
  rect(ctx, '#a8703f', 112, 84, 66, 1);
  rect(ctx, '#6b4226', 119, 88, 3, 10);
  rect(ctx, '#6b4226', 173, 88, 3, 10);
  rect(ctx, '#7a4e2d', 150, 88, 20, 6);
  rect(ctx, '#e8c547', 159, 90, 2, 1);

  // Lámpara
  rect(ctx, '#333', 162, 82, 8, 2);
  rect(ctx, '#444', 165, 68, 2, 14);
  rect(ctx, '#e8c547', 160, 64, 10, 5);
  ctx.fillStyle = 'rgba(255, 230, 140, 0.10)';
  ctx.beginPath();
  ctx.moveTo(160, 69);
  ctx.lineTo(170, 69);
  ctx.lineTo(176, 84);
  ctx.lineTo(154, 84);
  ctx.fill();

  // Taza
  rect(ctx, '#c0392b', 155, 79, 4, 5);
  rect(ctx, '#c0392b', 159, 80, 1, 2);
  if (activity === 'play' || activity === 'study') {
    const steam = Math.floor(t / 300) % 2;
    rect(ctx, 'rgba(255,255,255,0.5)', 156 + steam, 76, 1, 2);
  }

  // Portátil
  rect(ctx, '#2b2b2b', 128, 62, 25, 20);
  rect(ctx, '#9aa0a6', 124, 82, 30, 2);
  rect(ctx, '#5f6368', 126, 82, 24, 1);
  drawScreen(ctx, 130, 64, 21, 16, activity, tables, t);

  if (activity === 'play') {
    ctx.fillStyle = 'rgba(80, 220, 130, 0.07)';
    ctx.fillRect(100, 56, 60, 30);
  }
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  activity: Activity,
  tables: number,
  t: number,
) {
  if (activity === 'play') {
    rect(ctx, '#0b2a1d', x, y, w, h);
    const n = Math.max(1, Math.min(4, tables));
    const cols = n === 1 ? 1 : 2;
    const rows = n <= 2 ? 1 : 2;
    const cw = Math.floor(w / cols);
    const ch = Math.floor(h / rows);
    for (let i = 0; i < n; i++) {
      const tx = x + (i % cols) * cw;
      const ty = y + Math.floor(i / cols) * ch;
      rect(ctx, '#6b4226', tx + 1, ty + 1, cw - 2, ch - 2);
      rect(ctx, '#1f7a4a', tx + 2, ty + 2, cw - 4, ch - 4);
      // Cartas parpadeando según la acción
      const phase = Math.floor(t / 250 + i * 3) % 5;
      for (let c = 0; c < Math.min(phase, 3); c++) rect(ctx, '#ffffff', tx + 3 + c * 2, ty + Math.floor(ch / 2) - 1, 1, 2);
      if (phase === 4) rect(ctx, '#e8c547', tx + cw - 4, ty + ch - 4, 1, 1);
    }
  } else if (activity === 'study') {
    rect(ctx, '#f2efe6', x, y, w, h);
    for (let ly = y + 2; ly < y + h - 1; ly += 3) {
      const len = 6 + ((ly * 7) % 11);
      rect(ctx, '#7a7a7a', x + 2, ly, Math.min(len, w - 4), 1);
    }
    const scroll = Math.floor(t / 400) % (h - 4);
    rect(ctx, '#c0392b', x + w - 2, y + 1 + scroll, 1, 3);
  } else if (activity === 'rest') {
    rect(ctx, '#050505', x, y, w, h);
  } else {
    rect(ctx, '#1d3557', x, y, w, h);
    drawSprite(ctx, SPADE, x + 7, y + 4, { x: '#e8c547' });
  }
}

function drawChair(ctx: CanvasRenderingContext2D) {
  rect(ctx, '#1d1d1d', 92, 64, 5, 27);
  rect(ctx, '#c0392b', 93, 66, 1, 22);
  rect(ctx, '#1d1d1d', 92, 90, 22, 3);
  rect(ctx, '#444', 102, 93, 2, 3);
  rect(ctx, '#333', 95, 96, 16, 1);
  rect(ctx, '#111', 95, 97, 2, 1);
  rect(ctx, '#111', 109, 97, 2, 1);
}

function drawPlayer(ctx: CanvasRenderingContext2D, activity: Activity, t: number) {
  const ox = 96;
  const oy = 71;
  if (activity === 'rest') {
    // Dormido en la cama
    rect(ctx, '#3b2416', 6, 77, 7, 4);
    rect(ctx, '#f1c27d', 8, 79, 5, 3);
    const z = Math.floor(t / 500) % 3;
    ctx.fillStyle = '#e9e9e9';
    ctx.font = '6px monospace';
    ctx.fillText('z', 16 + z * 3, 74 - z * 3);
    return;
  }
  drawSprite(ctx, PLAYER, ox, oy);
}

function drawArm(ctx: CanvasRenderingContext2D, activity: Activity, t: number) {
  if (activity === 'rest') return;
  const ox = 96;
  const oy = 71;
  // Brazo: se mueve al teclear
  const typing = activity === 'play' || activity === 'study';
  const frame = typing ? Math.floor(t / (activity === 'play' ? 110 : 400)) % 2 : 0;
  rect(ctx, '#22385e', ox + 8, oy + 12, 4, 5);
  rect(ctx, '#2f4b7c', ox + 10, oy + 14, 20, 2);
  rect(ctx, '#f1c27d', ox + 30, oy + 12 - frame, 2, 2);
}

export default function Scene({ activity, tables }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const props = useRef({ activity, tables });
  props.current = { activity, tables };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    const loop = (t: number) => {
      const { activity, tables } = props.current;
      ctx.clearRect(0, 0, SCENE_W, SCENE_H);
      drawRoom(ctx, t);
      drawChair(ctx);
      drawPlayer(ctx, activity, t);
      drawDesk(ctx, activity, tables, t);
      drawArm(ctx, activity, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={SCENE_W}
      height={SCENE_H}
      className="scene-canvas"
      aria-label="Tu habitación: el jugador frente al portátil"
    />
  );
}
