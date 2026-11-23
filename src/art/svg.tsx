/**
 * react-native-svg primitives for the ported art engine.
 *
 * The web art marks build steps with `data-stage="n"` on groups. Here `G` reads that
 * prop: inside a <StageProvider stage={k}>, groups with a stage above k are hidden and
 * fade in when k reaches them. That powers the order tracker's plate assembling itself.
 */
import { createContext, useContext, useEffect, type ReactNode } from "react";
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import {
  Circle,
  ClipPath,
  Ellipse,
  G as SvgG,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Defs as SvgDefs,
  Text as SvgText,
  type GProps,
} from "react-native-svg";

export { Circle, ClipPath, Ellipse, Line, LinearGradient, Path, Polygon, Polyline, RadialGradient, Rect, Stop, Svg, SvgDefs, SvgText };

const StageContext = createContext<number | null>(null);

/** Show only build stages <= `stage`; omit `stage` (or pass null) to show the finished dish. */
export function StageProvider({ stage, children }: { stage: number | null; children: ReactNode }) {
  return <StageContext.Provider value={stage}>{children}</StageContext.Provider>;
}

type DataProps = { "data-stage"?: string | number; "data-layer"?: string; "data-piece"?: string; "data-bit"?: string };

const AnimatedG = Animated.createAnimatedComponent(SvgG);

function StagedG({ n, ...rest }: GProps & { n: number }) {
  const stage = useContext(StageContext);
  const shown = stage === null || n <= stage;
  const o = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    o.value = shown ? withDelay(80 * Math.max(0, n - (stage ?? n)), withTiming(1, { duration: 520 })) : withTiming(0, { duration: 200 });
  }, [shown, n, stage, o]);
  const animatedProps = useAnimatedProps(() => ({ opacity: o.value }));
  return <AnimatedG {...rest} animatedProps={animatedProps} />;
}

/** Drop-in for the web `<g>`: strips data-* attributes and honours data-stage. */
export function G(props: GProps & DataProps) {
  const { "data-stage": stage, "data-layer": _l, "data-piece": _p, "data-bit": _b, ...rest } = props;
  if (stage !== undefined) return <StagedG n={Number(stage)} {...rest} />;
  return <SvgG {...rest} />;
}
