/** The rider's route on the tracker map, sampled so the app can walk along it (react-native-svg has no getPointAtLength). */
type P = [number, number];

export const ROUTE_D = "M86 262 C150 250 170 196 236 200 C300 204 312 150 372 140 C430 130 452 92 520 84";
const SEGMENTS: [P, P, P, P][] = [
  [[86, 262], [150, 250], [170, 196], [236, 200]],
  [[236, 200], [300, 204], [312, 150], [372, 140]],
  [[372, 140], [430, 130], [452, 92], [520, 84]],
];

const bez = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

const pts: P[] = [];
for (const [a, b, c, d] of SEGMENTS) for (let i = pts.length ? 1 : 0; i <= 40; i++) {
  const t = i / 40;
  pts.push([bez(a[0], b[0], c[0], d[0], t), bez(a[1], b[1], c[1], d[1], t)]);
}
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));

export const ROUTE_LENGTH = cum[cum.length - 1];

/** Point at progress p (0..1) along the route. */
export function pointAt(p: number): P {
  const target = Math.min(1, Math.max(0, p)) * ROUTE_LENGTH;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const span = cum[i] - cum[i - 1] || 1;
  const f = (target - cum[i - 1]) / span;
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
}
