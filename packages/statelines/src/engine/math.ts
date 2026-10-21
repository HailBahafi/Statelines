export const TAU = Math.PI * 2;

/** cos(30°): the horizontal scale of the isometric projection. */
export const COS30 = Math.cos(Math.PI / 6);

export const clamp = (value: number, min = 0, max = 1): number =>
  value < min ? min : value > max ? max : value;

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const smoothstep = (t: number): number => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/** Rises from 0 to 1 and back to 0 over the interval [0, 1]; 0 outside it. */
export const bump = (t: number): number => (t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t));

/** Positive modulo: `wrap(-1, 3) === 2`. */
export const wrap = (value: number, period: number): number => ((value % period) + period) % period;

/** Gaussian falloff, 1 at distance 0. */
export const falloff = (distance: number, sigma: number): number =>
  Math.exp(-(distance * distance) / (2 * sigma * sigma));

/** Deterministic pseudo-random number in [0, 1) for a pair of integers. */
export const hash2 = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** The equivalent of `angle` nearest to `reference`, so springs never take the long way round. */
export const nearestAngle = (angle: number, reference: number): number =>
  angle + TAU * Math.round((reference - angle) / TAU);
