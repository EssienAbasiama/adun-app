/**
 * Order tracker: the plate assembles itself stage by stage while a rider crosses a stylised
 * Lagos map. Confetti and a success haptic on delivery. Demo pacing: delivered after ~36 s.
 */
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { DishArt } from "@/art/DishArt";
import { Pressy } from "@/components/Pressy";
import { Thumb } from "@/components/Thumb";
import { money } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { nowMs } from "@/lib/ids";
import { pointAt, ROUTE_D, ROUTE_LENGTH } from "@/lib/route";
import { TRACKER_T as T } from "@/lib/site";
import { useStore, useStoreHydrated } from "@/lib/store";
import { color, font } from "@/lib/theme";

const COLORS = ["#E2621B", "#F2B23A", "#2E5B3A", "#C3301E", "#F5EEE3", "#1F2A55"];

function Bit({ i, t, w }: { i: number; t: SharedValue<number>; w: number }) {
  const seed = useMemo(() => {
    const r = (n: number) => ((Math.sin(i * 97.13 + n * 13.7) + 1) / 2) % 1;
    const angle = (-160 + r(1) * 140) * (Math.PI / 180);
    const v = 380 + r(2) * 440;
    return { vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, spin: -720 + r(3) * 1440, size: 6 + r(4) * 8, round: i % 3 === 0 };
  }, [i]);
  const style = useAnimatedStyle(() => {
    const s = t.value * 2.6;
    return {
      opacity: t.value < 0.95 ? 1 : 0,
      transform: [{ translateX: seed.vx * s }, { translateY: seed.vy * s + 0.5 * 1100 * s * s }, { rotate: `${seed.spin * t.value}deg` }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", left: w / 2, top: 220, width: seed.size, height: seed.round ? seed.size : seed.size * 0.4, borderRadius: seed.round ? 99 : 2, backgroundColor: COLORS[i % COLORS.length] },
        style,
      ]}
    />
  );
}

function Confetti({ fire }: { fire: boolean }) {
  const { width } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    if (fire) t.value = withTiming(1, { duration: 2600, easing: Easing.linear });
  }, [fire, t]);
  if (!fire) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 70 }, (_, i) => (
        <Bit key={i} i={i} t={t} w={width} />
      ))}
    </View>
  );
}

function RouteMap({ progress, area }: { progress: number; area: string }) {
  const [rx, ry] = pointAt(progress);
  return (
    <View style={styles.map}>
      <Svg viewBox="0 0 600 340" width="100%" height={undefined} style={{ aspectRatio: 600 / 340 }}>
        <Rect x="0" y="0" width="600" height="340" fill="#EFE6D4" />
        <Path d="M0 230 C120 210 200 300 330 280 C450 262 520 320 600 300 V340 H0 Z" fill="#9CC3D6" />
        {["M0 120 H600", "M0 180 C200 170 380 190 600 160", "M140 0 V340", "M300 0 C290 120 320 220 300 340", "M460 0 V240", "M0 60 C200 80 380 40 600 70"].map((d) => (
          <Path key={d} d={d} stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round" />
        ))}
        {[[40, 20, 70, 60], [190, 70, 80, 40], [350, 90, 70, 50], [500, 180, 70, 40], [200, 200, 70, 50]].map(([x, y, w, h], i) => (
          <Rect key={i} x={x} y={y} width={w} height={h} rx={8} fill="#E2D5BC" />
        ))}
        <Path d={ROUTE_D} stroke="#1D1410" strokeOpacity={0.15} strokeWidth={6} fill="none" strokeDasharray="2 10" strokeLinecap="round" />
        <Path d={ROUTE_D} stroke="#E2621B" strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${ROUTE_LENGTH}`} strokeDashoffset={ROUTE_LENGTH * (1 - progress)} />
        <G x={86} y={262}>
          <Circle r={16} fill="#1D1410" />
          <SvgText y={5} textAnchor="middle" fontSize={15} fontFamily={font.display} fill="#F5EEE3">
            À
          </SvgText>
        </G>
        <G x={520} y={84}>
          <Circle r={20} fill="#E2621B" opacity={0.25} />
          <Circle r={9} fill="#E2621B" stroke="#fff" strokeWidth={3} />
        </G>
        <G x={rx} y={ry}>
          <Circle r={15} fill="#fff" stroke="#1D1410" strokeWidth={2} />
          <G x={-9} y={-9} scale={0.75}>
            <Circle cx={6} cy={17} r={2.6} stroke="#1D1410" strokeWidth={2} fill="none" />
            <Circle cx={18} cy={17} r={2.6} stroke="#1D1410" strokeWidth={2} fill="none" />
            <Path d="M8.6 17h6.8l2.2-6.5H20M14 6.5h2.6l1 4M4 12.5h6l1.5 4.5" stroke="#1D1410" strokeWidth={2} fill="none" strokeLinecap="round" />
          </G>
        </G>
      </Svg>
      <View style={styles.mapFoot}>
        <Text style={styles.mapFootB}>Àdùn → {area}</Text>
        <Text style={styles.mapFootS}>Rider: Emeka · 4.9 ★</Text>
      </View>
    </View>
  );
}

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const order = useStore((s) => s.order);
  const add = useStore((s) => s.add);
  const hydrated = useStoreHydrated();
  const [now, setNow] = useState(() => nowMs());
  const [rating, setRating] = useState(0);
  const celebrated = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), 200);
    return () => clearInterval(id);
  }, []);

  const elapsed = order ? (now - order.placedAt) / 1000 : 0;
  const status = T.reduce<number>((s, t, i) => (elapsed >= t ? i : s), 0);
  const done = status === T.length - 1;
  const delivery = order?.mode === "delivery";
  const featured = order?.lines.find((l) => l.thumb.kind === "art")?.thumb;
  const slug = featured && featured.kind === "art" ? featured.slug : "party-jollof";
  const opts = featured && featured.kind === "art" ? featured.opts : undefined;
  const stage = status === 0 ? 0 : status === 1 ? 2 : 5;
  const progress = Math.min(1, Math.max(0, (elapsed - T[3]) / (T[4] - T[3])));
  const minsLeft = order ? Math.max(1, Math.ceil(order.eta * (1 - elapsed / T[4]))) : 0;

  useEffect(() => {
    if (done && !celebrated.current) {
      celebrated.current = true;
      haptic.success();
    }
  }, [done]);

  if (!hydrated) return <View style={styles.root} />;
  if (!order) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.h1}>No order yet</Text>
        <Pressy onPress={() => router.replace("/")} style={styles.cta}>
          <Text style={styles.ctaText}>Back to the table</Text>
        </Pressy>
      </View>
    );
  }

  const steps = [
    { t: "Order received", d: `Thanks, ${order.name}. The ticket just hit the rail.` },
    { t: "In the pot", d: "Our pot station has fired your order. Smells like Saturday." },
    { t: "Plating", d: "Garnish on, edges wiped, one last taste for quality." },
    delivery ? { t: "On the way", d: `Your rider is crossing ${order.area ?? "Lagos"}. Hold tight.` } : { t: "Ready at the counter", d: "Say your name at the pass. It's still steaming." },
    delivery ? { t: "Delivered", d: "Knock knock. Enjoy every bite." } : { t: "Collected", d: "Enjoy every bite." },
  ];
  const plate = Math.min(width - 80, 320);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}>
        <Text style={styles.eyebrow}>Order {order.id}</Text>
        <Animated.Text key={done ? "done" : status} entering={FadeInDown.duration(450)} style={styles.h1}>
          {done ? (delivery ? "Delivered. Dig in." : "Collected. Dig in.") : steps[status].t + "…"}
        </Animated.Text>
        <View style={styles.eta}>
          <Text style={styles.etaText}>{done ? `✓ Enjoy, ${order.name}` : `🛵 ~${minsLeft} min to your door`}</Text>
        </View>

        <View style={styles.plateCard}>
          <DishArt slug={slug} opts={opts} size={plate} stage={stage} />
          <Text style={styles.plateCaption}>Live from the pass · demo pacing</Text>
        </View>

        <View style={styles.steps}>
          {steps.map((s, i) => {
            const past = i < status || done;
            const now_ = i === status && !done;
            return (
              <View key={s.t} style={styles.step}>
                <View style={[styles.stepDot, past && { backgroundColor: color.leaf }, now_ && { backgroundColor: color.palm }]}>
                  <Text style={styles.stepDotText}>{past ? "✓" : i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, !past && !now_ && { color: color.ink3 }]}>{s.t}</Text>
                  {past || now_ ? <Text style={styles.stepD}>{s.d}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        {delivery ? <RouteMap progress={progress} area={order.area ?? "Lagos"} /> : null}

        <View style={styles.receipt}>
          <Text style={styles.receiptTitle}>Receipt</Text>
          {order.lines.map((l) => (
            <View key={l.key} style={styles.rLine}>
              <Thumb thumb={l.thumb} size={30} />
              <Text style={styles.rName} numberOfLines={1}>
                {l.qty}× {l.name}
              </Text>
              <Text style={styles.rPrice}>{money(l.unit * l.qty)}</Text>
            </View>
          ))}
          <View style={[styles.rLine, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.paper3, paddingTop: 10 }]}>
            <Text style={[styles.rName, { fontFamily: font.bodyHeavy }]}>Total paid on arrival</Text>
            <Text style={[styles.rPrice, { fontFamily: font.display, fontSize: 18 }]}>{money(order.total)}</Text>
          </View>
        </View>

        {done && (
          <Animated.View entering={FadeIn.delay(400)} style={styles.rate}>
            <Text style={styles.rateTitle}>{rating ? "Thank you. The chefs saw that." : "How was it?"}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressy key={n} feel="tick" depth={0.8} onPress={() => setRating(n)} accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}>
                  <Text style={[styles.star, n <= rating && { color: color.palm }]}>★</Text>
                </Pressy>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressy
                onPress={() => {
                  order.lines.forEach((l) => add({ ...l }));
                  router.replace("/cart");
                }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Order it again</Text>
              </Pressy>
              <Pressy onPress={() => router.replace("/reserve")} style={[styles.cta, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: color.ink }]}>
                <Text style={[styles.ctaText, { color: color.ink }]}>Book a table</Text>
              </Pressy>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Confetti fire={done} />

      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressy onPress={() => router.replace("/")} style={styles.round} accessibilityLabel="Close">
          <Text style={styles.roundText}>✕</Text>
        </Pressy>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2.2, color: color.palm, textTransform: "uppercase", marginTop: 44 },
  h1: { fontFamily: font.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.3, color: color.ink, marginTop: 6 },
  eta: { alignSelf: "flex-start", backgroundColor: color.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginTop: 12 },
  etaText: { fontFamily: font.bodyBold, fontSize: 13, color: color.paper },
  plateCard: { marginTop: 18, borderRadius: 28, backgroundColor: color.paper2, alignItems: "center", paddingVertical: 22 },
  plateCaption: { fontFamily: font.bodyHeavy, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: color.ink3, marginTop: 10 },
  steps: { marginTop: 18, gap: 14 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.paper3, alignItems: "center", justifyContent: "center" },
  stepDotText: { fontFamily: font.bodyHeavy, fontSize: 12.5, color: color.paper },
  stepTitle: { fontFamily: font.bodyBold, fontSize: 15, color: color.ink, marginTop: 5 },
  stepD: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.ink2, marginTop: 2 },
  map: { marginTop: 20, borderRadius: 26, overflow: "hidden", backgroundColor: "#EFE6D4" },
  mapFoot: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  mapFootB: { fontFamily: font.bodyBold, fontSize: 13.5, color: color.ink },
  mapFootS: { fontFamily: font.body, fontSize: 12.5, color: color.ink3 },
  receipt: { marginTop: 20, backgroundColor: color.paper2, borderRadius: 24, padding: 16, gap: 10 },
  receiptTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  rLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  rName: { flex: 1, fontFamily: font.body, fontSize: 14, color: color.ink },
  rPrice: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  rate: { marginTop: 20, backgroundColor: "#FBEFD8", borderRadius: 24, padding: 18, gap: 12 },
  rateTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  stars: { flexDirection: "row", gap: 6 },
  star: { fontSize: 32, color: color.paper3 },
  cta: { height: 48, paddingHorizontal: 20, borderRadius: 999, backgroundColor: color.ink, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.bodyHeavy, fontSize: 14, color: color.paper },
  top: { position: "absolute", left: 0, top: 0, paddingHorizontal: 16 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,253,248,0.92)", alignItems: "center", justifyContent: "center" },
  roundText: { fontFamily: font.bodyHeavy, fontSize: 15, color: color.ink },
});
