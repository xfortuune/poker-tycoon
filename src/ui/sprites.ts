/**
 * Pixel art original dibujado en código.
 * Cada sprite es una matriz de caracteres; cada carácter es un color de la paleta.
 */

export const PAL: Record<string, string> = {
  h: '#3b2416', // pelo
  s: '#f1c27d', // piel
  S: '#c98d55', // piel sombra
  e: '#1a1a1a', // ojo
  r: '#2f4b7c', // sudadera
  R: '#22385e', // sudadera sombra
  p: '#3a3a4a', // pantalón
  P: '#2a2a36', // pantalón sombra
  k: '#151515', // zapatillas
  w: '#e9e9e9', // blanco
};

/** Personaje sentado, mirando a la derecha (24×28) */
export const PLAYER = [
  '....hhhhhh..............',
  '...hhhhhhhhh............',
  '..hhhhhhhhhhh...........',
  '..hhhhhhhhssss..........',
  '..hhhhhhhsssss..........',
  '..hhhhhhsssses..........',
  '..hhhhhhssssss..........',
  '...hhhhSssssssS.........',
  '....hhSssssss...........',
  '.....SSssssss...........',
  '.......SSss.............',
  '.....rrrrrrr............',
  '....rrrrrrrrr...........',
  '...rrrrrrrrrrr..........',
  '...Rrrrrrrrrrr..........',
  '...Rrrrrrrrrrr..........',
  '...Rrrrrrrrrrr..........',
  '...Rrrrrrrrrrr..........',
  '...RRrrrrrrrrr..........',
  '...ppppppppppppppppp....',
  '...PPPPppppppppppppp....',
  '...............pppp.....',
  '...............pppp.....',
  '...............pppp.....',
  '...............pppp.....',
  '...............pppp.....',
  '...............ppppkk...',
  '..............kkkkkkk...',
];

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  x: number,
  y: number,
  pal: Record<string, string> = PAL,
) {
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const c = line[col];
      if (c === '.') continue;
      ctx.fillStyle = pal[c] ?? '#ff00ff';
      ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

/** Pica (♠) de 7×7 para pósteres y logos de la sala ficticia */
export const SPADE = [
  '...x...',
  '..xxx..',
  '.xxxxx.',
  'xxxxxxx',
  'xxxxxxx',
  'xx.x.xx',
  '...x...',
  '..xxx..',
];
