/**
 * The Table: a wooden lazy-Susan of signature plates you spin with your thumb.
 * Rotation lives in one shared value on the UI thread; plates, wood and background colour
 * are all derived from it, so the spin stays at 60/120 fps even with eight heavy SVG plates.
 */
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  cancelAnimation,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from "react-native-svg";
import { DishArt } from "@/art/DishArt";
import { Pressy } from "@/components/Pressy";
import { Steam } from "@/components/Steam";
import { money, pad2 } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { signatures } from "@/lib/menu";
import { useOrder } from "@/lib/order";
import { color, font } from "@/lib/theme";

const N = signatures.length;
const STEP = 360 / N;
const NEIGHBOR_SCALE = 0.6;
const ANGLES = [...signatures.map((_, i) => i * STEP), 360];
const BGS = [...signatures.map((s) => s.theme.bg), signatures[0].theme.bg];
const SPRING = { damping: 22, stiffness: 150, mass: 1 };

function wrap(a: number) {
  "worklet";
  return ((((a + 180) % 360) + 360) % 360) - 180;
}
function mod(n: number, m: number) {
  "worklet";
  return ((n % m) + m) % m;
}

type Geo = { w: number; h: number; S: number; cx: number; cy: number; R: number; ringCy: number; disc: number };

function useGeo(): Geo {
  const { width: w, height: h } = useWindowDimensions();
  return useMemo(() => {
    const S = Math.min(w * 0.66, h * 0.33, 380);
    const cy = h * 0.5;
    // tight enough that the neighbouring plates peek in at the screen edges
    const R = Math.max(S * 1.15, w * 0.78);
    return { w, h, S, cx: w / 2, cy, R, ringCy: cy + R, disc: 2 * (R + S * 0.64) };
  }, [w, h]);
}

/** The wooden turntable, drawn once and rotated as a whole. */
const Wood = memo(function Wood({ size }: { size: number }) {
  const c = size / 2;
  const rings = Array.from({ length: Math.floor(c / 20) }, (_, i) => c - 18 - i * 20).filter((r) => r > 40);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="wood" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#C2874F" />
          <Stop offset="0.7" stopColor="#B57842" />
          <Stop offset="0.96" stopColor="#A56A36" />
          <Stop offset="1" stopColor="#8C5A2E" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#wood)" />
      {rings.map((r) => (
        <Circle key={r} cx={c} cy={c} r={r} fill="none" stroke="#5A3414" strokeOpacity={0.07} strokeWidth={2} />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const a = ((i * STEP + STEP / 2) * Math.PI) / 180;
        return <Line key={i} x1={c} y1={c} x2={c + Math.sin(a) * c} y2={c - Math.cos(a) * c} stroke="#7A4A22" strokeOpacity={0.22} strokeWidth={1.5} />;
      })}
      <Circle cx={c} cy={c} r={c - 6} fill="none" stroke="#D7A56C" strokeWidth={3} />
      <Circle cx={c} cy={c} r={c - 12} fill="none" stroke="#8C5A2E" strokeWidth={6} />
      <Circle cx={c} cy={c} r={c * 0.22} fill="none" stroke="#784620" strokeOpacity={0.35} strokeWidth={2} />
    </Svg>
  );
});

/** Soft contact shadow under a plate. */
const PlateShadow = memo(function PlateShadow({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} style={{ position: "absolute", left: size * 0.03, top: size * 0.08 }}>
      <Defs>
        <RadialGradient id="ps" cx="50%" cy="50%" r="50%">
          <Stop offset="0.6" stopColor="#28120A" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#28120A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#ps)" />
    </Svg>
  );
});

function Plate({ i, rot, g, onPress }: { i: number; rot: SharedValue<number>; g: Geo; onPress: (i: number) => void }) {
  const sig = signatures[i];
  const style = useAnimatedStyle(() => {
    const e = wrap(i * STEP - rot.value);
    const ae = Math.abs(e);
    const t = Math.min(1, ae / STEP);
    const rad = (e * Math.PI) / 180;
    return {
      opacity: ae < 100 ? 1 : 0,
      zIndex: 100 - Math.round(ae),
      transform: [
        { translateX: g.cx + g.R * Math.sin(rad) - g.S / 2 },
        { translateY: g.ringCy - g.R * Math.cos(rad) - g.S / 2 },
        { scale: 1 - (1 - NEIGHBOR_SCALE) * t },
        { rotate: `${e}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.plate, { width: g.S, height: g.S }, style]}>
      <Pressy depth={0.97} feel="none" onPress={() => onPress(i)} accessibilityLabel={sig.name} style={{ flex: 1 }}>
        <PlateShadow size={g.S} />
        <DishArt slug={sig.slug} size={g.S} />
      </Pressy>
    </Animated.View>
  );
}

export default function TableScreen() {
  const g = useGeo();
  const insets = useSafeAreaInsets();
  const { addSignature } = useOrder();
  const rot = useSharedValue(-150);
  const start = useSharedValue(0);
  const [active, setActive] = useState(0);
  const [settled, setSettled] = useState(false);
  const [ci, setCi] = useState(0);
  const sig = signatures[active];
  const k = 180 / (Math.PI * g.R);

  // spin in on first open, like the website
  useEffect(() => {
    rot.value = withTiming(0, { duration: 2100, easing: Easing.out(Easing.exp) }, (done) => {
      if (done) runOnJS(setSettled)(true);
    });
  }, [rot]);

  const onActive = useCallback((i: number) => {
    setActive(i);
    setCi(0);
    haptic.tick();
  }, []);

  useAnimatedReaction(
    () => mod(Math.round(rot.value / STEP), N),
    (cur, prev) => {
      if (prev !== null && cur !== prev) runOnJS(onActive)(cur);
    },
  );

  const settleOn = useCallback(
    (target: number, velocity = 0) => {
      "worklet";
      rot.value = withSpring(target, { ...SPRING, velocity }, (done) => {
        if (done) runOnJS(setSettled)(true);
      });
    },
    [rot],
  );

  const pan = usePanGesture({
    minDistance: 6,
    onActivate: (e) => {
      "worklet";
      cancelAnimation(rot);
      start.value = rot.value + e.translationX * k;
      runOnJS(setSettled)(false);
    },
    onUpdate: (e) => {
      "worklet";
      rot.value = start.value - e.translationX * k;
    },
    onDeactivate: (e) => {
      "worklet";
      const base = Math.round(rot.value / STEP) * STEP;
      const projected = Math.round((rot.value - e.velocityX * k * 0.22) / STEP) * STEP;
      const target = Math.max(base - 2 * STEP, Math.min(base + 2 * STEP, projected));
      settleOn(target, -e.velocityX * k);
    },
  });

  const goTo = useCallback(
    (i: number) => {
      if (i === active) {
        router.push(`/dish/${signatures[i].slug}`);
        return;
      }
      haptic.tap();
      setSettled(false);
      const cur = rot.value;
      settleOn(Math.round((cur + wrap(i * STEP - cur)) / STEP) * STEP);
    },
    [active, rot, settleOn],
  );

  // cycle the ingredient callouts once the table rests
  useEffect(() => {
    if (!settled) return;
    const id = setInterval(() => setCi((c) => (c + 1) % sig.callouts.length), 2400);
    return () => clearInterval(id);
  }, [settled, sig.callouts.length]);

  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(mod(rot.value, 360), ANGLES, BGS) }));
  const disc = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rot.value}deg` }] }));
  const titleSize = g.h < 720 ? 34 : Math.min(48, g.w * 0.115);
  const callout = sig.callouts[ci % sig.callouts.length];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.root, bg]}>
        {/* header */}
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Text style={styles.logo}>Àdùn</Text>
          <Text style={styles.count}>
            {pad2(active + 1)} <Text style={{ color: color.ink3 }}>/ {pad2(N)}</Text>
          </Text>
        </View>

        {/* title block */}
        <View style={styles.titleBlock} pointerEvents="none">
          <Animated.Text key={`eb-${sig.slug}`} entering={FadeIn.duration(400)} exiting={FadeOut.duration(150)} style={[styles.eyebrow, { color: sig.theme.accent }]}>
            {sig.region === "naija" ? "Naija classic" : "Around the world"} · {sig.origin.city}
          </Animated.Text>
          <Animated.Text key={`t-${sig.slug}`} entering={FadeInDown.duration(520).easing(Easing.out(Easing.exp))} exiting={FadeOutUp.duration(220)} style={[styles.title, { fontSize: titleSize, color: sig.theme.deep }]}>
            {sig.name}
          </Animated.Text>
          <Animated.Text key={`tg-${sig.slug}`} entering={FadeIn.delay(120).duration(500)} exiting={FadeOut.duration(150)} numberOfLines={2} style={styles.tagline}>
            {sig.tagline}
          </Animated.Text>
        </View>

        {/* the lazy-Susan */}
        <Animated.View pointerEvents="none" style={[styles.abs, { left: g.cx - g.disc / 2, top: g.ringCy - g.disc / 2, width: g.disc, height: g.disc }, disc]}>
          <Wood size={g.disc} />
        </Animated.View>
        {signatures.map((s, i) => (
          <Plate key={s.slug} i={i} rot={rot} g={g} onPress={goTo} />
        ))}

        {/* steam over the front plate */}
        <View pointerEvents="none" style={[styles.abs, { left: g.cx - g.S * 0.4, top: g.cy - g.S * 1.05, zIndex: 200 }]}>
          <Steam size={g.S * 0.8} />
        </View>

        {/* ingredient callout */}
        {settled && callout && (
          <Animated.View key={`co-${sig.slug}-${ci}`} entering={FadeInDown.duration(380)} exiting={FadeOut.duration(200)} style={[styles.callout, { top: g.cy + g.S * 0.54 }]} pointerEvents="none">
            <View style={[styles.calloutDot, { backgroundColor: sig.theme.accent }]} />
            <Text style={styles.calloutLabel}>{callout.label}</Text>
            <Text style={styles.calloutNote} numberOfLines={1}>
              {callout.note}
            </Text>
          </Animated.View>
        )}

        {/* order panel */}
        <View style={[styles.panel, { bottom: insets.bottom + 72 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price</Text>
            <Animated.Text key={`p-${sig.slug}`} entering={FadeIn.duration(350)} style={[styles.price, { color: sig.theme.deep }]}>
              {money(sig.price)}
            </Animated.Text>
            <Text style={styles.meta}>
              {sig.time} · {"🌶".repeat(sig.heat) || "No heat"}
            </Text>
          </View>
          <View style={{ gap: 8, alignItems: "flex-end" }}>
            <Pressy feel="none" onPress={() => addSignature(sig)} style={[styles.btn, { backgroundColor: color.ink }]} accessibilityRole="button" accessibilityLabel={`Add ${sig.name} to order`}>
              <Text style={styles.btnText}>＋ Add to order</Text>
            </Pressy>
            <Pressy onPress={() => router.push(`/dish/${sig.slug}`)} style={styles.link} accessibilityRole="button">
              <Text style={[styles.linkText, { color: sig.theme.deep }]}>Customize this plate →</Text>
            </Pressy>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  abs: { position: "absolute" },
  plate: { position: "absolute", left: 0, top: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22 },
  logo: { fontFamily: font.display, fontSize: 28, color: color.ink, letterSpacing: -0.5 },
  count: { fontFamily: font.bodyBold, fontSize: 13, color: color.ink, letterSpacing: 1 },
  titleBlock: { alignItems: "center", paddingHorizontal: 24, marginTop: 14, gap: 6 },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
  title: { fontFamily: font.display, textAlign: "center", letterSpacing: -1, lineHeight: undefined },
  tagline: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.ink2, textAlign: "center", maxWidth: 320 },
  callout: { position: "absolute", alignSelf: "center", zIndex: 210, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,253,248,0.94)", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, maxWidth: "88%" },
  calloutDot: { width: 8, height: 8, borderRadius: 4 },
  calloutLabel: { fontFamily: font.display, fontSize: 15, color: color.ink },
  calloutNote: { fontFamily: font.body, fontSize: 12.5, color: color.ink3, flexShrink: 1 },
  panel: { position: "absolute", left: 16, right: 16, zIndex: 220, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,253,248,0.92)", borderRadius: 26, paddingVertical: 16, paddingHorizontal: 18 },
  label: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: color.ink3 },
  price: { fontFamily: font.display, fontSize: 30, letterSpacing: -0.5, marginTop: 2 },
  meta: { fontFamily: font.body, fontSize: 12.5, color: color.ink3, marginTop: 2 },
  btn: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 999 },
  btnText: { fontFamily: font.bodyHeavy, fontSize: 14, color: color.paper },
  link: { paddingVertical: 2 },
  linkText: { fontFamily: font.bodyBold, fontSize: 13 },
});
