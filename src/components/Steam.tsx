import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

const WISPS = [
  "M100 250 C 80 210, 120 180, 98 140 S 82 70, 104 20",
  "M70 250 C 58 214, 92 190, 74 150 S 60 92, 80 46",
  "M132 250 C 146 210, 112 186, 130 146 S 148 88, 126 40",
];

function Wisp({ d, i, size }: { d: string; i: number; size: number }) {
  const t = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(i * 900, withRepeat(withTiming(1, { duration: 3200 + i * 500, easing: Easing.inOut(Easing.sin) }), -1, false));
  }, [i, reduce, t]);
  const style = useAnimatedStyle(() => {
    const p = t.value;
    return {
      opacity: reduce ? 0.25 : Math.sin(p * Math.PI) * 0.55,
      transform: [{ translateY: -p * size * 0.35 }, { translateX: Math.sin(p * Math.PI * 2 + i) * size * 0.04 }, { scaleX: 1 + p * 0.5 }],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size * 1.3} viewBox="0 0 200 260">
        <Defs>
          <LinearGradient id={`steam${i}`} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#fff" stopOpacity="0" />
            <Stop offset="0.35" stopColor="#fff" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#fff" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={d} stroke={`url(#steam${i})`} strokeWidth={i % 2 ? 16 : 22} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** Steam rising off a plate. `size` is the plate's width; the wisps rise above it. */
export function Steam({ size }: { size: number }) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size * 1.3 }}>
      {WISPS.map((d, i) => (
        <Wisp key={i} d={d} i={i} size={size} />
      ))}
    </View>
  );
}
