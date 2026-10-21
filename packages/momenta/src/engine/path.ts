export type Point2 = readonly [number, number];

const segmentLengths = (points: readonly Point2[]): number[] =>
  points.slice(1).map((p, i) => Math.hypot(p[0] - points[i]![0], p[1] - points[i]![1]));

/** The point at fraction `t` (0…1) of the way along a polyline, measured by length. */
export function pointAlong(points: readonly Point2[], t: number): Point2 {
  const lengths = segmentLengths(points);
  const total = lengths.reduce((a, b) => a + b, 0);
  let distance = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (distance <= length || i === lengths.length - 1) {
      const k = length === 0 ? 0 : Math.min(1, distance / length);
      const a = points[i]!, b = points[i + 1]!;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    distance -= length;
  }
  return points[points.length - 1]!;
}

/** The polyline cut at fraction `t`, ending exactly at `pointAlong(points, t)`. */
export function sliceAlong(points: readonly Point2[], t: number): Point2[] {
  const lengths = segmentLengths(points);
  const total = lengths.reduce((a, b) => a + b, 0);
  let distance = Math.max(0, Math.min(1, t)) * total;
  const out: Point2[] = [points[0]!];
  for (let i = 0; i < lengths.length; i++) {
    if (distance >= lengths[i]!) {
      out.push(points[i + 1]!);
      distance -= lengths[i]!;
    } else {
      out.push(pointAlong(points, t));
      break;
    }
  }
  return out;
}

/** The fraction of total length at which vertex `index` sits. */
export function vertexFraction(points: readonly Point2[], index: number): number {
  const lengths = segmentLengths(points);
  const total = lengths.reduce((a, b) => a + b, 0);
  return lengths.slice(0, index).reduce((a, b) => a + b, 0) / total;
}
