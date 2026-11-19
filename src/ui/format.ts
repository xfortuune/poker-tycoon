const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const numFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const eur = (v: number) => eurFmt.format(v);
export const signedEur = (v: number) => (v > 0 ? '+' : '') + eurFmt.format(v);
export const num = (v: number) => numFmt.format(v);
export const d1 = (v: number) => dec1.format(v);
export const d2 = (v: number) => dec2.format(v);
export const signed1 = (v: number) => (v > 0 ? '+' : '') + dec1.format(v);
export const pct = (v: number) => `${Math.round(v * 100)} %`;
export const tone = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
