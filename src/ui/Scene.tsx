import { useEffect, useRef } from 'react';
import type { HomeId } from '../game/config';
import type { Setup, StreamGear } from '../game/types';
import { drawSprite, PLAYER, SPADE } from './sprites';

export const SCENE_W = 192;
export const SCENE_H = 108;

/** Posición de la cabeza del personaje, en % del escenario (para bocadillos) */
export const HEAD_POS = { x: (104 / SCENE_W) * 100, y: (70 / SCENE_H) * 100 };

type Activity = 'idle' | 'play' | 'stream' | 'study' | 'rest' | 'coach';

interface Props {
  activity: Activity;
  tables: number;
  home: HomeId;
  setup: Setup;
  gear: StreamGear;
  schoolOpen: boolean;
}

type Ctx = CanvasRenderingContext2D;

function rect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Pseudoaleatorio determinista para que el decorado no cambie entre frames */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ── Elementos comunes ─────────────────────────────────────────

function drawPlanks(ctx: Ctx, y0: number, base: string, line: string) {
  rect(ctx, base, 0, y0, SCENE_W, SCENE_H - y0);
  for (let y = y0 + 4; y < SCENE_H; y += 6) {
    rect(ctx, line, 0, y, SCENE_W, 1);
    const off = (y / 6) % 2 === 0 ? 0 : 20;
    for (let x = off; x < SCENE_W; x += 40) rect(ctx, line, x, y - 5, 1, 5);
  }
}

function drawSkyline(ctx: Ctx, x0: number, y0: number, w: number, h: number, seed: number, t: number, sky: string[]) {
  // Cielo en bandas
  const band = Math.ceil(h / sky.length);
  sky.forEach((c, i) => rect(ctx, c, x0, y0 + i * band, w, Math.min(band, h - i * band)));
  const rnd = lcg(seed);
  let x = x0;
  while (x < x0 + w) {
    const bw = 5 + Math.floor(rnd() * 9);
    const bh = Math.floor(h * (0.3 + rnd() * 0.55));
    const top = y0 + h - bh;
    const ww = Math.min(bw, x0 + w - x);
    rect(ctx, rnd() > 0.5 ? '#141a2e' : '#1b2238', x, top, ww, bh);
    for (let wy = top + 2; wy < y0 + h - 2; wy += 3) {
      for (let wx = x + 1; wx < x + ww - 1; wx += 2) {
        const r = rnd();
        if (r > 0.62) {
          const flicker = r > 0.985 && Math.sin(t / 900 + wx * 3 + wy) > 0.7;
          rect(ctx, flicker ? '#141a2e' : r > 0.9 ? '#ffe9a0' : '#e8c547', wx, wy, 1, 1);
        }
      }
    }
    x += bw + (rnd() > 0.7 ? 1 : 0);
  }
}

function drawPlant(ctx: Ctx, x: number, y: number, big = false) {
  const s = big ? 1.6 : 1;
  rect(ctx, '#8a4b2a', x, y, Math.round(8 * s), Math.round(7 * s));
  rect(ctx, '#6b3a20', x, y, Math.round(8 * s), 1);
  const leaves = '#2e8b57';
  const dark = '#1f6b42';
  rect(ctx, leaves, x + 1, y - Math.round(6 * s), 2, Math.round(6 * s));
  rect(ctx, dark, x + 4, y - Math.round(9 * s), 2, Math.round(9 * s));
  rect(ctx, leaves, x + 6, y - Math.round(5 * s), 2, Math.round(5 * s));
  rect(ctx, leaves, x - 1, y - Math.round(8 * s), 3, 2);
  rect(ctx, dark, x + 6, y - Math.round(11 * s), 3, 2);
}

function drawSpadePoster(ctx: Ctx, x: number, y: number) {
  rect(ctx, '#e8c547', x, y, 24, 30);
  rect(ctx, '#0f3d2a', x + 1, y + 1, 22, 28);
  drawSprite(ctx, SPADE, x + 9, y + 5, { x: '#e8c547' });
  rect(ctx, '#e8c547', x + 5, y + 18, 14, 1);
  rect(ctx, '#c0392b', x + 7, y + 21, 10, 1);
  rect(ctx, '#e8c547', x + 6, y + 24, 12, 1);
}

// ── Escenarios ────────────────────────────────────────────────

const STARS = [
  [18, 16], [24, 30], [31, 19], [40, 36], [47, 27], [21, 40], [35, 14], [50, 41], [28, 24],
];

function drawHabitacion(ctx: Ctx, t: number) {
  rect(ctx, '#2b4a3c', 0, 0, SCENE_W, 80);
  for (let x = 4; x < SCENE_W; x += 8) rect(ctx, '#2f5143', x, 0, 2, 72);
  rect(ctx, '#6b4226', 0, 72, SCENE_W, 8);
  rect(ctx, '#8a5a34', 0, 72, SCENE_W, 1);
  drawPlanks(ctx, 80, '#7a4e2d', '#6a4227');
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

  drawSpadePoster(ctx, 138, 12);

  // Estantería
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

function drawPiso(ctx: Ctx, t: number) {
  rect(ctx, '#4a5d73', 0, 0, SCENE_W, 80);
  for (let x = 0; x < SCENE_W; x += 24) rect(ctx, '#43546a', x, 0, 1, 74);
  rect(ctx, '#e9e2d0', 0, 74, SCENE_W, 6);
  rect(ctx, '#cfc6b0', 0, 74, SCENE_W, 1);
  drawPlanks(ctx, 80, '#a8774a', '#93653c');
  rect(ctx, '#2f6d8c', 50, 98, 100, 7);
  rect(ctx, '#3d86a8', 52, 99, 96, 5);

  // Ventanal con la ciudad al atardecer
  rect(ctx, '#e9e2d0', 8, 6, 60, 46);
  drawSkyline(ctx, 10, 8, 56, 42, 7, t, ['#3b2a5c', '#6b3a6b', '#b5546b', '#e88a5a']);
  rect(ctx, '#e9e2d0', 37, 8, 2, 42);
  rect(ctx, '#d8cfb8', 6, 52, 64, 2);

  // Cuadro y estantería flotante
  rect(ctx, '#222', 140, 14, 28, 20);
  rect(ctx, '#e8c547', 141, 15, 26, 18);
  rect(ctx, '#1f6b4a', 142, 16, 24, 16);
  rect(ctx, '#c0392b', 146, 22, 5, 7);
  rect(ctx, '#fff', 147, 23, 3, 5);
  rect(ctx, '#111', 155, 22, 5, 7);
  rect(ctx, '#fff', 156, 23, 3, 5);
  rect(ctx, '#e9e2d0', 76, 34, 30, 2);
  rect(ctx, '#e8c547', 80, 28, 4, 6);
  rect(ctx, '#c0392b', 86, 26, 3, 8);
  rect(ctx, '#2f4b7c', 90, 27, 3, 7);
  drawPlant(ctx, 97, 28);

  // Sofá
  rect(ctx, '#8c2f2f', 2, 78, 50, 12);
  rect(ctx, '#a33a3a', 2, 76, 50, 4);
  rect(ctx, '#7a2828', 0, 80, 5, 14);
  rect(ctx, '#7a2828', 49, 80, 5, 14);
  rect(ctx, '#b84a4a', 8, 82, 18, 5);
  rect(ctx, '#b84a4a', 28, 82, 18, 5);
  rect(ctx, '#3b2416', 4, 94, 2, 4);
  rect(ctx, '#3b2416', 47, 94, 2, 4);
  rect(ctx, '#e8c547', 12, 78, 6, 5);

  drawPlant(ctx, 180, 92, true);
}

function drawEstudio(ctx: Ctx, t: number) {
  // Pared de ladrillo
  rect(ctx, '#6e3b2e', 0, 0, SCENE_W, 80);
  for (let y = 0; y < 76; y += 4) {
    rect(ctx, '#5a2f24', 0, y + 3, SCENE_W, 1);
    const off = (y / 4) % 2 === 0 ? 0 : 5;
    for (let x = off; x < SCENE_W; x += 10) rect(ctx, '#5a2f24', x, y, 1, 3);
  }
  rect(ctx, '#2a2a30', 0, 76, SCENE_W, 4);
  drawPlanks(ctx, 80, '#4a4a52', '#3e3e45');
  rect(ctx, '#1f6b4a', 54, 98, 98, 7);
  rect(ctx, '#e8c547', 54, 98, 98, 1);

  // Neón "ALL IN" con pica
  const on = Math.sin(t / 300) > -0.92;
  const pink = on ? '#ff5fa2' : '#7a2f52';
  const cyan = on ? '#5ff2ff' : '#2a6f7a';
  ctx.fillStyle = on ? 'rgba(255, 95, 162, 0.15)' : 'rgba(0,0,0,0)';
  ctx.fillRect(10, 8, 56, 30);
  drawSprite(ctx, SPADE, 14, 16, { x: cyan });
  // A L L   I N en píxeles
  const letters: [number, number, number, number][] = [
    [24, 16, 1, 7], [27, 16, 1, 7], [25, 15, 2, 1], [25, 19, 2, 1], // A
    [30, 15, 1, 8], [30, 22, 3, 1], // L
    [35, 15, 1, 8], [35, 22, 3, 1], // L
    [42, 15, 1, 8], // I
    [45, 15, 1, 8], [48, 15, 1, 8], [46, 17, 1, 2], [47, 19, 1, 2], // N
  ];
  for (const [x, y, w, h] of letters) rect(ctx, pink, x, y, w, h);
  rect(ctx, pink, 22, 27, 30, 1);

  // Paneles acústicos
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    rect(ctx, '#222228', 128 + i * 15, 10 + j * 15, 13, 13);
    rect(ctx, '#2c2c34', 129 + i * 15, 11 + j * 15, 5, 5);
    rect(ctx, '#2c2c34', 135 + i * 15, 17 + j * 15, 5, 5);
  }

  // Estantería con trofeos
  rect(ctx, '#3b2416', 4, 44, 46, 2);
  rect(ctx, '#3b2416', 4, 60, 46, 2);
  rect(ctx, '#e8c547', 8, 38, 4, 6);
  rect(ctx, '#e8c547', 9, 36, 2, 2);
  rect(ctx, '#c0c0c0', 16, 39, 4, 5);
  rect(ctx, '#cd7f32', 24, 40, 4, 4);
  rect(ctx, '#e9e9e9', 34, 53, 3, 7);
  rect(ctx, '#2f4b7c', 37, 52, 3, 8);
  rect(ctx, '#c0392b', 40, 54, 3, 6);
  drawPlant(ctx, 10, 58);

  // Puf
  rect(ctx, '#2f4b7c', 18, 88, 26, 10);
  rect(ctx, '#3d5f99', 20, 85, 22, 5);

  drawPlant(ctx, 180, 92, true);
}

function drawAtico(ctx: Ctx, t: number) {
  // Gran ventanal de noche
  drawSkyline(ctx, 0, 0, SCENE_W, 76, 42, t, ['#070b1f', '#0b1230', '#121a42', '#1b2558']);
  rect(ctx, '#f5e6a8', 160, 8, 6, 6);
  rect(ctx, '#070b1f', 163, 8, 3, 3);
  for (let x = 0; x < SCENE_W; x += 48) rect(ctx, '#c9a227', x, 0, 2, 78);
  rect(ctx, '#c9a227', 0, 0, SCENE_W, 2);
  rect(ctx, '#c9a227', 0, 76, SCENE_W, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, 0, SCENE_W, 76);

  // Suelo de mármol
  rect(ctx, '#d9d4c7', 0, 78, SCENE_W, 30);
  for (let x = 0; x < SCENE_W; x += 16) rect(ctx, '#c4bfb2', x, 78, 1, 30);
  for (let y = 86; y < SCENE_H; y += 10) rect(ctx, '#c4bfb2', 0, y, SCENE_W, 1);
  rect(ctx, '#bdb7a8', 20, 92, 3, 1);
  rect(ctx, '#bdb7a8', 70, 100, 4, 1);
  rect(ctx, '#0f3d2a', 54, 98, 98, 7);
  rect(ctx, '#c9a227', 55, 99, 96, 5);
  rect(ctx, '#0f3d2a', 57, 100, 92, 3);

  // Sofá blanco de cuero
  rect(ctx, '#f0ece2', 2, 78, 50, 12);
  rect(ctx, '#ffffff', 2, 76, 50, 4);
  rect(ctx, '#d9d4c7', 0, 80, 5, 14);
  rect(ctx, '#d9d4c7', 49, 80, 5, 14);
  rect(ctx, '#c9a227', 4, 94, 2, 4);
  rect(ctx, '#c9a227', 47, 94, 2, 4);
  rect(ctx, '#0f3d2a', 10, 79, 8, 5);
  rect(ctx, '#c0392b', 36, 79, 8, 5);

  // Escultura de una ficha dorada
  rect(ctx, '#222', 64, 84, 10, 14);
  rect(ctx, '#e8c547', 63, 74, 12, 10);
  rect(ctx, '#fff7c2', 66, 77, 6, 4);
  rect(ctx, '#c9a227', 63, 78, 12, 1);

  drawPlant(ctx, 180, 92, true);
}

// ── Equipo de streaming y escuela ─────────────────────────────

/** Centro superior de la pantalla principal según el nivel de monitores (para la webcam) */
const MAIN_SCREEN_TOP: [number, number][] = [
  [140, 62],
  [141, 55],
  [130, 57],
  [146, 55],
];

function drawStreamGear(ctx: Ctx, gear: StreamGear, monitors: number, activity: Activity, t: number) {
  const live = activity === 'stream';
  if (gear.luz > 0) {
    // Aro de luz (o foco) junto a la silla
    rect(ctx, '#333', 81, 60, 1, 38);
    rect(ctx, '#333', 78, 97, 7, 1);
    const on = live || activity === 'coach';
    const c = on ? '#fff7d6' : '#8a8f96';
    if (gear.luz === 1) {
      rect(ctx, c, 78, 50, 7, 1);
      rect(ctx, c, 78, 58, 7, 1);
      rect(ctx, c, 77, 51, 1, 7);
      rect(ctx, c, 85, 51, 1, 7);
    } else {
      rect(ctx, '#222', 76, 50, 11, 8);
      rect(ctx, c, 77, 51, 9, 6);
    }
    if (on) {
      ctx.fillStyle = 'rgba(255, 247, 214, 0.08)';
      ctx.fillRect(84, 46, 30, 40);
    }
  }
  if (gear.camara > 0) {
    const [cx, cy] = MAIN_SCREEN_TOP[monitors];
    if (gear.camara === 1) {
      rect(ctx, '#111', cx - 2, cy - 2, 5, 2);
      rect(ctx, live && Math.floor(t / 500) % 2 ? '#ff3b3b' : '#555', cx, cy - 2, 1, 1);
    } else {
      rect(ctx, '#1a1a1a', cx - 3, cy - 4, 7, 4);
      rect(ctx, '#3a3a3a', cx - 1, cy - 3, 3, 2);
      rect(ctx, live ? '#ff3b3b' : '#555', cx + 3, cy - 4, 1, 1);
    }
  }
  if (gear.micro > 0) {
    // Micro sobre la mesa, a la izquierda del teclado
    rect(ctx, '#333', 116, 80, 1, 4);
    rect(ctx, '#333', 114, 83, 5, 1);
    rect(ctx, gear.micro === 2 ? '#c9a227' : '#2b2b2b', 115, 75, 3, 5);
    rect(ctx, '#777', 115, 76, 3, 1);
  }
}

function drawDiploma(ctx: Ctx) {
  rect(ctx, '#c9a227', 99, 40, 14, 11);
  rect(ctx, '#f5f0e1', 100, 41, 12, 9);
  drawSprite(ctx, SPADE.slice(0, 5), 103, 42, { x: '#0f3d2a' });
  rect(ctx, '#c0392b', 102, 48, 8, 1);
}

// ── Setup ─────────────────────────────────────────────────────

function drawDesk(ctx: Ctx, home: HomeId) {
  const top = home === 'atico' ? '#1a1a1a' : home === 'estudio' ? '#2b2b2b' : '#8a5a34';
  const edge = home === 'atico' ? '#c9a227' : home === 'estudio' ? '#444' : '#a8703f';
  const leg = home === 'atico' ? '#c9a227' : home === 'estudio' ? '#555' : '#6b4226';
  rect(ctx, top, 112, 84, 66, 4);
  rect(ctx, edge, 112, 84, 66, 1);
  rect(ctx, leg, 119, 88, 3, 10);
  rect(ctx, leg, 173, 88, 3, 10);
}

function drawPC(ctx: Ctx, level: number, t: number) {
  if (level <= 0) return;
  const x = 150;
  if (level === 1) {
    rect(ctx, '#2b2b2b', x, 86, 9, 12);
    rect(ctx, '#3a3a3a', x + 1, 87, 7, 2);
    rect(ctx, '#5fdc7f', x + 6, 95, 1, 1);
    return;
  }
  const hue = (t / 20) % 360;
  const glow = level === 2 ? `hsl(${hue}, 90%, 60%)` : '#5aa9ff';
  rect(ctx, '#111', x - 2, 84 + (level === 3 ? -2 : 1), 12, level === 3 ? 16 : 13);
  rect(ctx, glow, x - 1, 86, 1, 10);
  rect(ctx, '#1d1d1d', x + 1, 87, 7, 8);
  rect(ctx, glow, x + 3, 89, 3, 3);
  if (level === 3) rect(ctx, '#5aa9ff', x + 1, 96, 7, 1);
}

function drawChair(ctx: Ctx, level: number) {
  if (level === 0) {
    // Silla plegable
    rect(ctx, '#8a8f96', 94, 68, 2, 22);
    rect(ctx, '#a0643a', 93, 70, 4, 12);
    rect(ctx, '#a0643a', 92, 90, 20, 2);
    rect(ctx, '#8a8f96', 96, 92, 1, 6);
    rect(ctx, '#8a8f96', 108, 92, 1, 6);
    rect(ctx, '#8a8f96', 98, 94, 9, 1);
    return;
  }
  const back = level === 2 ? '#1d1d1d' : level === 3 ? '#3a3f47' : '#1d1d1d';
  const top = level >= 2 ? 58 : 64;
  rect(ctx, back, 92, top, 5, 91 - top);
  if (level === 2) {
    rect(ctx, '#c0392b', 93, top + 2, 1, 28);
    rect(ctx, '#c0392b', 95, top + 2, 1, 28);
    rect(ctx, '#111', 91, top, 7, 6);
  } else if (level === 3) {
    for (let y = top + 1; y < 88; y += 2) rect(ctx, '#55606b', 93, y, 3, 1);
    rect(ctx, '#2a2e34', 91, top - 2, 7, 6);
    rect(ctx, '#2a2e34', 96, 84, 10, 2);
  } else {
    rect(ctx, '#c0392b', 93, 66, 1, 22);
  }
  rect(ctx, back, 92, 90, 22, 3);
  rect(ctx, '#444', 102, 93, 2, 3);
  rect(ctx, '#333', 95, 96, 16, 1);
  rect(ctx, '#111', 95, 97, 2, 1);
  rect(ctx, '#111', 109, 97, 2, 1);
}

function drawScreen(ctx: Ctx, x: number, y: number, w: number, h: number, activity: Activity, tables: number, t: number) {
  if (activity === 'coach') {
    // Videollamada con un alumno
    rect(ctx, '#203040', x, y, w, h);
    const cx = x + Math.floor(w / 2);
    rect(ctx, '#6b4a2e', cx - 3, y + 3, 6, 3);
    rect(ctx, '#e0b088', cx - 3, y + 5, 6, 5);
    const talk = Math.floor(t / 220) % 2;
    rect(ctx, '#7a3b3b', cx - 1, y + 8, 2, talk ? 1 : 0.5);
    rect(ctx, '#c0392b', cx - 5, y + 10, 10, Math.max(1, h - 10));
    rect(ctx, '#1f7a4a', x + 1, y + h - 5, 6, 4);
    rect(ctx, '#ffffff', x + 2, y + h - 4, 1, 2);
    return;
  }
  if (activity === 'play' || activity === 'stream') {
    rect(ctx, '#0b2a1d', x, y, w, h);
    if (activity === 'stream') {
      // Chat del directo en la esquina
      rect(ctx, '#1a1030', x + w - 5, y, 5, h);
      for (let ly = 0; ly < h - 1; ly += 2) {
        const on = (Math.floor(t / 180) + ly) % 3 !== 0;
        if (on) rect(ctx, ly % 4 === 0 ? '#b48cff' : '#e9e9e9', x + w - 4, y + h - 2 - ly, 2 + ((ly * 3) % 2), 1);
      }
      w -= 5;
    }
    if (tables <= 0) return;
    const n = Math.min(4, tables);
    const cols = n === 1 ? 1 : 2;
    const rows = n <= 2 ? 1 : 2;
    const cw = Math.floor(w / cols);
    const ch = Math.floor(h / rows);
    for (let i = 0; i < n; i++) {
      const tx = x + (i % cols) * cw;
      const ty = y + Math.floor(i / cols) * ch;
      rect(ctx, '#6b4226', tx + 1, ty + 1, cw - 2, ch - 2);
      rect(ctx, '#1f7a4a', tx + 2, ty + 2, cw - 4, ch - 4);
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
    const scroll = Math.floor(t / 400) % Math.max(1, h - 4);
    rect(ctx, '#c0392b', x + w - 2, y + 1 + scroll, 1, 3);
  } else if (activity === 'rest') {
    rect(ctx, '#050505', x, y, w, h);
  } else {
    rect(ctx, '#1d3557', x, y, w, h);
    if (w >= 14) drawSprite(ctx, SPADE, x + Math.floor(w / 2) - 3, y + Math.floor(h / 2) - 4, { x: '#e8c547' });
  }
}

function drawMonitors(ctx: Ctx, level: number, activity: Activity, tables: number, t: number) {
  if (level === 0) {
    // Portátil
    rect(ctx, '#2b2b2b', 128, 62, 25, 20);
    rect(ctx, '#9aa0a6', 124, 82, 30, 2);
    rect(ctx, '#5f6368', 126, 82, 24, 1);
    drawScreen(ctx, 130, 64, 21, 16, activity, tables, t);
    return;
  }
  const screens: [number, number, number, number][] =
    level === 1
      ? [[126, 56, 30, 22]]
      : level === 2
        ? [[116, 58, 28, 20], [146, 58, 28, 20]]
        : [[113, 60, 21, 16], [135, 56, 22, 18], [158, 60, 20, 16]];
  // Reparte las mesas entre las pantallas
  let left = tables;
  screens.forEach(([x, y, w, h], i) => {
    const per = Math.ceil(left / (screens.length - i));
    left -= per;
    rect(ctx, '#151515', x - 1, y - 1, w + 2, h + 2);
    drawScreen(ctx, x, y, w, h, activity, per, t);
    rect(ctx, '#2b2b2b', x + Math.floor(w / 2) - 1, y + h + 1, 3, 84 - (y + h + 1));
    rect(ctx, '#2b2b2b', x + Math.floor(w / 2) - 4, 83, 9, 1);
  });
  // Teclado y ratón
  rect(ctx, '#3a3a3a', 122, 82, 22, 2);
  rect(ctx, '#555', 123, 82, 20, 1);
  rect(ctx, '#3a3a3a', 147, 82, 3, 2);
}

function drawDeskProps(ctx: Ctx, monitors: number, activity: Activity, t: number) {
  if (monitors <= 1) {
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
  }
  // Taza (con dos o más monitores no queda sitio en la mesa)
  if (monitors <= 1) {
    rect(ctx, '#c0392b', 155, 79, 4, 5);
    rect(ctx, '#c0392b', 159, 80, 1, 2);
    if (activity !== 'idle' && activity !== 'rest') {
      const steam = Math.floor(t / 300) % 2;
      rect(ctx, 'rgba(255,255,255,0.5)', 156 + steam, 76, 1, 2);
    }
  }
  if (activity === 'play' || activity === 'stream') {
    ctx.fillStyle = activity === 'stream' ? 'rgba(200, 120, 255, 0.07)' : 'rgba(80, 220, 130, 0.07)';
    ctx.fillRect(100, 52, 80, 34);
  }
}

function drawPlayer(ctx: Ctx, activity: Activity, home: HomeId, t: number) {
  if (activity === 'rest') {
    // Dormido (en la cama o en el sofá)
    const hx = home === 'habitacion' ? 6 : 8;
    const hy = home === 'habitacion' ? 77 : 74;
    rect(ctx, '#3b2416', hx, hy, 7, 4);
    rect(ctx, '#f1c27d', hx + 2, hy + 2, 5, 3);
    if (home !== 'habitacion') rect(ctx, '#2f4b7c', hx + 7, hy + 3, 26, 5);
    const z = Math.floor(t / 500) % 3;
    ctx.fillStyle = home === 'atico' ? '#1b2558' : '#e9e9e9';
    ctx.font = '6px monospace';
    ctx.fillText('z', hx + 10 + z * 3, hy - 3 - z * 3);
    return;
  }
  drawSprite(ctx, PLAYER, 96, 71);
}

function drawArm(ctx: Ctx, activity: Activity, t: number) {
  if (activity === 'rest') return;
  const ox = 96;
  const oy = 71;
  const typing = activity === 'play' || activity === 'stream' || activity === 'study' || activity === 'coach';
  const fast = activity === 'play' || activity === 'stream';
  const frame = typing ? Math.floor(t / (fast ? 110 : 400)) % 2 : 0;
  rect(ctx, '#22385e', ox + 8, oy + 12, 4, 5);
  rect(ctx, '#2f4b7c', ox + 10, oy + 14, 20, 2);
  rect(ctx, '#f1c27d', ox + 30, oy + 12 - frame, 2, 2);
}

const BACKGROUNDS: Record<HomeId, (ctx: Ctx, t: number) => void> = {
  habitacion: drawHabitacion,
  piso: drawPiso,
  estudio: drawEstudio,
  atico: drawAtico,
};

export default function Scene({ activity, tables, home, setup, gear, schoolOpen }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const props = useRef({ activity, tables, home, setup, gear, schoolOpen });
  props.current = { activity, tables, home, setup, gear, schoolOpen };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    const loop = (t: number) => {
      const { activity, tables, home, setup, gear, schoolOpen } = props.current;
      ctx.clearRect(0, 0, SCENE_W, SCENE_H);
      BACKGROUNDS[home](ctx, t);
      if (schoolOpen) drawDiploma(ctx);
      drawChair(ctx, setup.silla);
      drawPlayer(ctx, activity, home, t);
      drawDesk(ctx, home);
      drawPC(ctx, setup.pc, t);
      drawMonitors(ctx, setup.monitores, activity, tables, t);
      drawDeskProps(ctx, setup.monitores, activity, t);
      drawStreamGear(ctx, gear, setup.monitores, activity, t);
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
      aria-label="Escenario: el jugador frente a su ordenador"
    />
  );
}
