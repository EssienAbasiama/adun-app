/**
 * The Belt: sushi and Naija small chops gliding round a stadium-shaped conveyor.
 * Touch the belt and it slows down; tap a plate to grab it and it joins your stack.
 */
import { router } from "expo-router";
import { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useFrameCallback, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import { BeltPlate } from "@/art/BeltArt";
import { Pressy } from "@/components/Pressy";
import { money } from "@/lib/format";
import { beltItems, tiers, type BeltItem, type BeltTier } from "@/lib/menu";
import { useOrder } from "@/lib/order";
import { useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";

type Track = { cx: number; top: number; r: number; L: number; P: number; plate: number };

/** Point s along a vertical stadium: down the right side, round the bottom, up the left, over the top. */
function stadium(t: Track, s: number) {
  "worklet";
  const { cx, top, r, L, P } = t;
  let d = ((s % P) + P) % P;
  if (d < L) return [cx + r, top + r + d];
  d -= L;
  if (d < Math.PI * r) {
    const a = d / r;
    return [cx + r * Math.cos(a), top + r + L + r * Math.sin(a)];
  }
  d -= Math.PI * r;
  if (d < L) return [cx - r, top + r + L - d];
  d -= L;
  const a = Math.PI + d / r;
  return [cx + r * Math.cos(a), top + r + r * Math.sin(a)];
}

const Plate = memo(function Plate({ item, i, offset, track, onGrab }: { item: BeltItem; i: number; offset: SharedValue<number>; track: Track; onGrab: (i: number, away: SharedValue<number>) => void }) {
  const away = useSharedValue(1);
  const gap = track.P / beltItems.length;
  const style = useAnimatedStyle(() => {
    const [x, y] = stadium(track, i * gap + offset.value);
    return { opacity: away.value, transform: [{ translateX: x - track.plate / 2 }, { translateY: y - track.plate / 2 }, { scale: away.value }] };
  });
  return (
    <Animated.View style={[styles.plate, { width: track.plate, height: track.plate }, style]}>
      <Pressy feel="none" depth={1.15} onPress={() => onGrab(i, away)} accessibilityLabel={`Grab ${item.name}, ${tiers[item.tier].label} plate, ${money(tiers[item.tier].price)}`}>
        <BeltPlate item={item} size={track.plate} />
      </Pressy>
    </Animated.View>
  );
});

export default function BeltScreen() {
  const { width: w, height: h } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addBelt } = useOrder();
  const plates = useStore((s) => s.plates);
  const offset = useSharedValue(0);
  const speed = useSharedValue(1);

  const track = useMemo<Track>(() => {
    const plate = Math.min(64, w * 0.16);
    const top = insets.top + 70;
    const bottom = h - insets.bottom - 96;
    const r = (w - 40 - plate) / 2;
    const L = Math.max(0, bottom - top - 2 * r - plate);
    return { cx: w / 2, top: top + plate / 2, r, L, P: 2 * L + 2 * Math.PI * r, plate };
  }, [w, h, insets.top, insets.bottom]);

  useFrameCallback((f) => {
    offset.value += ((f.timeSincePreviousFrame ?? 16) / 1000) * 46 * speed.value;
  });

  const grab = useCallback(
    (i: number, away: SharedValue<number>) => {
      if (away.value < 1) return;
      away.value = withSequence(withTiming(1.3, { duration: 110 }), withTiming(0, { duration: 180 }), withDelay(2400, withSpring(1, { damping: 10 })));
      addBelt(beltItems[i]);
    },
    [addBelt],
  );

  const stack = plates.slice(-9);
  const total = plates.reduce((n, p) => n + tiers[p.tier as BeltTier].price, 0);
  const legend = (Object.keys(tiers) as BeltTier[]).map((k) => ({ k, ...tiers[k] }));

  return (
    <View
      style={styles.root}
      onTouchStart={() => (speed.value = withTiming(0.35, { duration: 400 }))}
      onTouchEnd={() => (speed.value = withTiming(1, { duration: 700 }))}
      onTouchCancel={() => (speed.value = withTiming(1, { duration: 700 }))}
    >
      {/* the conveyor */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={track.cx - track.r - track.plate * 0.62} y={track.top - track.plate * 0.62} width={2 * track.r + track.plate * 1.24} height={track.L + 2 * track.r + track.plate * 1.24} rx={track.r + track.plate * 0.62} fill={color.night3} />
        <Rect x={track.cx - track.r + track.plate * 0.62} y={track.top + track.plate * 0.62} width={2 * track.r - track.plate * 1.24} height={track.L + 2 * track.r - track.plate * 1.24} rx={Math.max(0, track.r - track.plate * 0.62)} fill={color.night} />
        <Rect x={track.cx - track.r} y={track.top} width={2 * track.r} height={track.L + 2 * track.r} rx={track.r} fill="none" stroke="#3A2E26" strokeWidth={1.5} strokeDasharray="3 9" />
      </Svg>

      {/* the middle: title, legend and your stack */}
      <View pointerEvents="box-none" style={[styles.center, { top: track.top + track.plate, bottom: h - (track.top + track.L + 2 * track.r) + track.plate, left: track.cx - track.r + track.plate * 0.8, right: track.cx - track.r + track.plate * 0.8 }]}>
        <Text style={styles.eyebrow}>Runs daily 12:00 – 17:00</Text>
        <Text style={styles.h1}>The Belt</Text>
        <Text style={styles.lede}>Sushi and Naija small chops on colour-coded plates. Touch to slow it down, tap to grab.</Text>
        <View style={styles.legend}>
          {legend.map((t) => (
            <View key={t.k} style={styles.legendItem}>
              <View style={[styles.swatch, { borderColor: t.color }]} />
              <Text style={styles.legendText}>{money(t.price)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.stackWrap}>
          <View style={styles.stack}>
            {stack.map((p, idx) => (
              <Animated.View key={p.at} entering={ZoomIn.springify().damping(12)} style={[styles.stackPlate, { bottom: idx * 7, borderColor: tiers[p.tier as BeltTier].color, zIndex: idx }]} />
            ))}
          </View>
          <View>
            <Text style={styles.stackLabel}>Your stack</Text>
            <Text style={styles.stackCount}>
              {plates.length} {plates.length === 1 ? "plate" : "plates"}
            </Text>
            <Text style={styles.stackTotal}>{money(total)}</Text>
          </View>
        </View>
        {plates.length > 0 && (
          <Animated.View entering={FadeIn}>
            <Pressy onPress={() => router.push("/cart")} style={styles.settle}>
              <Text style={styles.settleText}>Settle up →</Text>
            </Pressy>
          </Animated.View>
        )}
      </View>

      {beltItems.map((it, i) => (
        <Plate key={it.id} item={it} i={i} offset={offset} track={track} onGrab={grab} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.night },
  plate: { position: "absolute", left: 0, top: 0 },
  center: { position: "absolute", justifyContent: "center", gap: 8 },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: color.palm },
  h1: { fontFamily: font.display, fontSize: 46, letterSpacing: -1.4, color: color.paper },
  lede: { fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.paper3 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, backgroundColor: color.white },
  legendText: { fontFamily: font.bodyBold, fontSize: 12.5, color: color.paper },
  stackWrap: { flexDirection: "row", alignItems: "flex-end", gap: 16, marginTop: 14 },
  stack: { width: 64, height: 64 + 8 * 7 },
  stackPlate: { position: "absolute", left: 0, width: 64, height: 22, borderRadius: 32, borderWidth: 5, backgroundColor: color.white },
  stackLabel: { fontFamily: font.bodyHeavy, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: color.paper3 },
  stackCount: { fontFamily: font.display, fontSize: 26, color: color.paper },
  stackTotal: { fontFamily: font.bodyBold, fontSize: 13, color: color.plantain },
  settle: { alignSelf: "flex-start", backgroundColor: color.palm, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, marginTop: 6 },
  settleText: { fontFamily: font.bodyHeavy, fontSize: 14, color: color.white },
});
