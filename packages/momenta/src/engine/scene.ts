import { COS30, TAU } from "./math";

/**
 * Every stroke and fill in a figure is one of these tones. Colour comes from the theme,
 * never from a figure, so every figure recolours together.
 *
 * - base:  the default object
 * - hi:    the object that is acting right now
 * - ok:    success, and only success
 * - err:   error, and only error
 * - muted: present but secondary
 * - faint: guides and things that recede
 * - ghost: a dashed outline for what is absent
 */
export type Tone = "base" | "hi" | "ok" | "err" | "muted" | "faint" | "ghost";

export type Vec3 = readonly [number, number, number];

export interface LineStyle {
  bold?: boolean;
  opacity?: number;
}

const OUTLINE: Record<Tone, string> = {
  base: "f e", hi: "f h", ok: "f k", err: "f x", muted: "f m", faint: "f l", ghost: "d m",
};
const CREASE: Record<Tone, string> = {
  base: "m", hi: "m", ok: "m", err: "m", muted: "l", faint: "l", ghost: "",
};
const STROKE: Record<Tone, string> = {
  base: "e", hi: "h", ok: "k", err: "x", muted: "m", faint: "l", ghost: "d m",
};
const FILL: Record<Tone, string> = {
  base: "fe", hi: "fh", ok: "fk", err: "fx", muted: "fm", faint: "fl", ghost: "fl",
};

const round = (v: number): number => Math.round(v * 10) / 10;
const shown = (opacity?: number): boolean => opacity === undefined || opacity > 0.01;
const alpha = (opacity?: number): string =>
  opacity === undefined || opacity >= 0.995 ? "" : ` opacity="${Math.round(opacity * 100) / 100}"`;

/**
 * Collects the SVG of one frame. Coordinates are world units: x runs to the lower right,
 * y to the lower left, z up. Callers draw back to front; later calls cover earlier ones.
 */
export class Scene {
  private readonly parts: string[] = [];

  constructor(private readonly offset = 0, private readonly marks = true) {}

  point(x: number, y: number, z: number): string {
    return round((x - y) * COS30) + "," + round((x + y) * 0.5 - z + this.offset);
  }

  private push(markup: string, opacity?: number): this {
    this.parts.push(opacity === undefined || opacity >= 0.995 ? markup : `<g${alpha(opacity)}>${markup}</g>`);
    return this;
  }

  /** A box centred on (cx, cy), resting on z. Silhouette in the tone, one dim crease inside. */
  box(cx: number, cy: number, z: number, w: number, d: number, h: number, tone: Tone = "base", opacity?: number): this {
    if (!shown(opacity)) return this;
    const a = cx - w / 2, b = cx + w / 2, c = cy - d / 2, e = cy + d / 2, top = z + h;
    const p = (x: number, y: number, zz: number) => this.point(x, y, zz);
    const outline = `${p(a, c, top)} ${p(b, c, top)} ${p(b, c, z)} ${p(b, e, z)} ${p(a, e, z)} ${p(a, e, top)}`;
    if (tone === "ghost") return this.push(`<polygon class="d m" points="${outline}"/>`, opacity);
    const near = p(b, e, top);
    return this.push(
      `<polygon class="${OUTLINE[tone]}" points="${outline}"/>` +
        `<path class="${CREASE[tone]}" d="M${p(b, c, top)}L${near}L${p(a, e, top)}M${near}L${p(b, e, z)}"/>`,
      opacity,
    );
  }

  /** An upright cylinder centred on (cx, cy), resting on z. */
  cylinder(cx: number, cy: number, z: number, r: number, h: number, tone: Tone = "base", opacity?: number): this {
    if (!shown(opacity)) return this;
    const ring = (zz: number, from: number, to: number, steps: number): string[] => {
      const out: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        out.push(this.point(cx + r * Math.cos(a), cy + r * Math.sin(a), zz));
      }
      return out;
    };
    const near0 = -Math.PI / 4, near1 = (3 * Math.PI) / 4;
    const side = [...ring(z, near0, near1, 14), ...ring(z + h, near1, near0, 14)].join(" ");
    const top = ring(z + h, 0, TAU, 28).slice(0, -1).join(" ");
    const cls = OUTLINE[tone];
    return this.push(`<polygon class="${cls}" points="${side}"/><polygon class="${cls}" points="${top}"/>`, opacity);
  }

  /** A flat circle on plane z: an outline, a filled dot, or a plate that hides what is behind. */
  disc(cx: number, cy: number, z: number, r: number, tone: Tone = "base",
       options: { fill?: boolean; plate?: boolean; opacity?: number } = {}): this {
    if (!shown(options.opacity)) return this;
    const steps = r < 6 ? 12 : 32;
    const pts: string[] = [];
    for (let i = 0; i < steps; i++) {
      const a = (TAU * i) / steps;
      pts.push(this.point(cx + r * Math.cos(a), cy + r * Math.sin(a), z));
    }
    const cls = options.fill ? FILL[tone] : (options.plate ? "f " : "") + STROKE[tone];
    return this.push(`<polygon class="${cls}" points="${pts.join(" ")}"/>`, options.opacity);
  }

  /** A flat rectangle outline on plane z. */
  rect(x0: number, y0: number, x1: number, y1: number, z: number, tone: Tone = "muted", opacity?: number): this {
    if (!shown(opacity)) return this;
    const pts = `${this.point(x0, y0, z)} ${this.point(x1, y0, z)} ${this.point(x1, y1, z)} ${this.point(x0, y1, z)}`;
    return this.push(`<polygon class="${STROKE[tone]}" points="${pts}"/>`, opacity);
  }

  line(a: Vec3, b: Vec3, tone: Tone = "muted", style: LineStyle = {}): this {
    return this.polyline([a, b], tone, style);
  }

  polyline(points: readonly Vec3[], tone: Tone = "muted", style: LineStyle & { closed?: boolean } = {}): this {
    if (!shown(style.opacity) || points.length < 2) return this;
    const d = points.map((p, i) => (i ? "L" : "M") + this.point(p[0], p[1], p[2])).join("") + (style.closed ? "Z" : "");
    return this.push(`<path class="${STROKE[tone]}${style.bold ? " w" : ""}" d="${d}"/>`, style.opacity);
  }

  /** An arc of a flat circle on plane z, from angle a0 to a1. */
  arc(cx: number, cy: number, z: number, r: number, a0: number, a1: number, tone: Tone = "muted", style: LineStyle = {}): this {
    const steps = Math.max(2, Math.ceil((Math.abs(a1 - a0) / TAU) * 48));
    const pts: Vec3[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
    }
    return this.polyline(pts, tone, style);
  }

  /** A flat polygon in any plane, filled so it hides what is behind. */
  panel(points: readonly Vec3[], tone: Tone = "base", opacity?: number): this {
    if (!shown(opacity)) return this;
    const pts = points.map(p => this.point(p[0], p[1], p[2])).join(" ");
    return this.push(`<polygon class="${OUTLINE[tone]}" points="${pts}"/>`, opacity);
  }

  /** A tick drawn flat on plane z, read as "done". */
  check(cx: number, cy: number, z: number, tone: Tone = "ok", opacity?: number): this {
    const m = (a: number, b: number) => this.point(cx + a + b, cy - a + b, z);
    if (!this.marks || !shown(opacity)) return this;
    return this.push(`<path class="${STROKE[tone]} w" d="M${m(-8, 0)}L${m(-3, 5)}L${m(9, -6)}"/>`, opacity);
  }

  /** A cross drawn flat on plane z, read as "failed". */
  cross(cx: number, cy: number, z: number, tone: Tone = "err", opacity?: number): this {
    const m = (a: number, b: number) => this.point(cx + a + b, cy - a + b, z);
    if (!this.marks || !shown(opacity)) return this;
    return this.push(`<path class="${STROKE[tone]} w" d="M${m(-6, -6)}L${m(6, 6)}M${m(-6, 6)}L${m(6, -6)}"/>`, opacity);
  }

  /** A four-pointed spark that faces the viewer, the mark of generated content. */
  sparkle(x: number, y: number, z: number, size: number, tone: Tone = "muted", opacity?: number): this {
    if (!shown(opacity)) return this;
    const [px, py] = this.point(x, y, z).split(",").map(Number) as [number, number];
    const k = size * 0.22, r = (v: number) => round(v);
    const d = `M${r(px)},${r(py - size)}Q${r(px + k)},${r(py - k)} ${r(px + size)},${r(py)}` +
      `Q${r(px + k)},${r(py + k)} ${r(px)},${r(py + size)}Q${r(px - k)},${r(py + k)} ${r(px - size)},${r(py)}` +
      `Q${r(px - k)},${r(py - k)} ${r(px)},${r(py - size)}Z`;
    return this.push(`<path class="${STROKE[tone]}" d="${d}"/>`, opacity);
  }

  toString(): string {
    return this.parts.join("");
  }
}
