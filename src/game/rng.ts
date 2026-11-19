/**
 * Generador pseudoaleatorio determinista (mulberry32).
 * El estado es un entero de 32 bits que se guarda en la partida,
 * así una partida cargada continúa exactamente igual.
 */
export class Rng {
  constructor(public state: number) {
    this.state = state >>> 0;
  }

  /** Número uniforme en [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Normal estándar (Box-Muller) */
  normal(mean = 0, sd = 1): number {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
