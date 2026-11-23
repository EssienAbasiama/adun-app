/**
 * Dish builder: every option redraws the plate. Pick eba over pounded yam and the swallow
 * changes colour; add goat meat and it appears in the pot. Flick the plate to spin it.
 */
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Extrapolation, FadeIn, FadeInDown, cancelAnimation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDecay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DishArt } from "@/art/DishArt";
import { Pressy } from "@/components/Pressy";
import { money } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { defaultOpts, menu, priceFor, signatures, type OptionGroup, type Opts } from "@/lib/menu";
import { useOrder } from "@/lib/order";
import { cartCount, useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";

const SMALL = 0.46;

function Group({ g, value, onChange, accent }: { g: OptionGroup; value: string | string[]; onChange: (v: string | string[]) => void; accent: string }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text style={styles.groupLabel}>{g.label}</Text>
        {g.hint ? <Text style={styles.groupHint}>{g.hint}</Text> : null}
      </View>
      <View style={styles.choices}>
        {g.choices.map((c) => {
          const on = Array.isArray(value) ? value.includes(c.id) : value === c.id;
          return (
            <Pressy
              key={c.id}
              feel="tick"
              accessibilityRole={g.type === "single" ? "radio" : "checkbox"}
              accessibilityState={{ checked: on }}
              onPress={() => {
                if (g.type === "single") onChange(c.id);
                else {
                  const arr = Array.isArray(value) ? value : [];
                  onChange(on ? arr.filter((x) => x !== c.id) : [...arr, c.id]);
                }
              }}
              style={[styles.choice, on && { backgroundColor: color.ink, borderColor: color.ink }]}
            >
              {g.type === "multi" ? <View style={[styles.tick, { borderColor: on ? accent : color.paper3, backgroundColor: on ? accent : "transparent" }]} /> : null}
              <Text style={[styles.choiceText, on && { color: color.paper }]}>{c.label}</Text>
              {c.price ? <Text style={[styles.choicePrice, on && { color: color.paper3 }]}>+{money(c.price)}</Text> : null}
            </Pressy>
          );
        })}
      </View>
    </View>
  );
}

export default function DishScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const sig = signatures.find((s) => s.slug === slug) ?? signatures[0];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addSignature, addItem } = useOrder();
  const count = useStore((s) => cartCount(s.cart));
  const [opts, setOpts] = useState<Opts>(() => defaultOpts(sig));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const unit = priceFor(sig, opts);
  const size = Math.min(width * 0.84, 420);
  // As you scroll to the options, the plate shrinks and pins under the top bar, so you can watch each choice redraw it.
  const plateTop = insets.top + 56;
  const pinTop = insets.top + 4;
  const collapse = Math.max(1, plateTop + size - pinTop - SMALL * size);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const pairs = useMemo(() => sig.pairs.map((id) => menu.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m), [sig]);

  // the plate: flick to spin, and a little pop whenever an option redraws it
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const optsKey = JSON.stringify(opts);
  useEffect(() => {
    pop.value = withSequence(withTiming(0.94, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 220 }));
  }, [optsKey, pop]);
  const pan = usePanGesture({
    activeOffsetX: [-8, 8],
    failOffsetY: [-12, 12],
    onActivate: () => {
      "worklet";
      cancelAnimation(spin);
    },
    onUpdate: (e) => {
      "worklet";
      spin.value += e.changeX * 0.45;
    },
    onDeactivate: (e) => {
      "worklet";
      spin.value = withDecay({ velocity: e.velocityX * 0.45, deceleration: 0.995 });
    },
  });
  const plateStyle = useAnimatedStyle(() => {
    const y = Math.max(0, scrollY.value);
    const k = interpolate(y, [0, collapse], [1, SMALL], Extrapolation.CLAMP);
    // until pinned, the plate's bottom edge rides with the content under it; after that it stays put
    const ty = y <= collapse ? (size / 2) * (1 - k) : y + pinTop + (SMALL * size) / 2 - plateTop - size / 2;
    return { transform: [{ translateY: ty }, { rotate: `${spin.value}deg` }, { scale: pop.value * k }] };
  });
  const bandStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapse - 70, collapse], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: Math.max(0, scrollY.value) }],
  }));

  const set = (id: string, v: string | string[]) => setOpts((o) => ({ ...o, [id]: v }));

  return (
    <View style={[styles.root, { backgroundColor: sig.theme.bg }]}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: plateTop, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* the band the pinned plate sits on, so text scrolls away underneath it */}
        <Animated.View pointerEvents="none" style={[styles.band, { height: pinTop + SMALL * size + 6 }, bandStyle]}>
          <View style={{ flex: 1, backgroundColor: sig.theme.bg }} />
          <LinearGradient colors={[sig.theme.bg, `${sig.theme.bg}00`]} style={styles.bandFade} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View entering={FadeIn.duration(500)} style={[{ alignSelf: "center", width: size, height: size, zIndex: 3 }, plateStyle]}>
            <DishArt slug={sig.slug} opts={opts} size={size} />
          </Animated.View>
        </GestureDetector>
        <Text style={styles.hint}>· Drag the plate to spin it ·</Text>

        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.body}>
          <Text style={[styles.eyebrow, { color: sig.theme.accent }]}>
            {sig.region === "naija" ? "Naija classic" : "Around the world"} · {sig.origin.city}, {sig.origin.country}
          </Text>
          <Text style={[styles.h1, { color: sig.theme.deep }]}>{sig.name}</Text>
          <Text style={styles.story}>{sig.story}</Text>
          <View style={styles.facts}>
            <Text style={styles.fact}>{"🌶".repeat(sig.heat) || "No heat"}</Text>
            <Text style={styles.fact}>⏱ {sig.time}</Text>
            <Text style={styles.fact}>{sig.kcal} kcal</Text>
          </View>

          {sig.options.map((g) => (
            <Group key={g.id} g={g} value={opts[g.id] ?? g.default} onChange={(v) => set(g.id, v)} accent={sig.theme.accent} />
          ))}

          {pairs.length > 0 && (
            <View style={{ marginTop: 26, gap: 12 }}>
              <Text style={styles.groupLabel}>Pairs well with</Text>
              {pairs.map((m) => (
                <View key={m.id} style={styles.pair}>
                  <Image source={m.image} style={styles.pairImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pairName}>{m.name}</Text>
                    <Text style={styles.pairPrice}>{money(m.price)}</Text>
                  </View>
                  <Pressy feel="none" onPress={() => addItem(m)} style={styles.pairAdd} accessibilityLabel={`Add ${m.name}`}>
                    <Text style={styles.pairAddText}>＋</Text>
                  </Pressy>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressy onPress={() => router.back()} style={styles.round} accessibilityLabel="Back">
          <Text style={styles.roundText}>←</Text>
        </Pressy>
        <Pressy onPress={() => router.push("/cart")} style={[styles.round, { width: undefined, paddingHorizontal: 14 }]} accessibilityLabel={`Your order, ${count} items`}>
          <Text style={styles.roundText}>Order · {count}</Text>
        </Pressy>
      </View>

      {/* add bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
        {added ? (
          <Animated.View entering={FadeIn} style={styles.addedRow}>
            <Text style={styles.addedText} numberOfLines={1}>In your order ✓</Text>
            <Pressy onPress={() => router.push("/cart")} style={styles.ghost}>
              <Text style={styles.ghostText}>Review</Text>
            </Pressy>
            <Pressy onPress={() => router.push("/checkout")} style={styles.ctaSmall}>
              <Text style={styles.ctaText}>Checkout →</Text>
            </Pressy>
          </Animated.View>
        ) : (
          <>
            <View style={styles.stepper}>
              <Pressy feel="tick" onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.step} accessibilityLabel="Fewer">
                <Text style={styles.stepText}>−</Text>
              </Pressy>
              <Text style={styles.qty}>{qty}</Text>
              <Pressy feel="tick" onPress={() => setQty((q) => q + 1)} style={styles.step} accessibilityLabel="More">
                <Text style={styles.stepText}>+</Text>
              </Pressy>
            </View>
            <Pressy
              feel="none"
              onPress={() => {
                addSignature(sig, opts, qty);
                setAdded(true);
                haptic.success();
              }}
              style={styles.cta}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>Add to order · {money(unit * qty)}</Text>
            </Pressy>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  band: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 2 },
  bandFade: { position: "absolute", left: 0, right: 0, bottom: -26, height: 26 },
  hint: { textAlign: "center", fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: color.ink3, marginTop: 8 },
  body: { paddingHorizontal: 20, marginTop: 18 },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  h1: { fontFamily: font.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.2, marginTop: 6 },
  story: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.ink2, marginTop: 10 },
  facts: { flexDirection: "row", gap: 8, marginTop: 14 },
  fact: { fontFamily: font.bodyBold, fontSize: 12.5, color: color.ink2, backgroundColor: "rgba(255,255,255,0.55)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, overflow: "hidden" },
  group: { marginTop: 26, gap: 10 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10 },
  groupLabel: { fontFamily: font.display, fontSize: 21, color: color.ink },
  groupHint: { fontFamily: font.body, fontSize: 12, color: color.ink3, flexShrink: 1, textAlign: "right" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(29,20,16,0.12)", backgroundColor: "rgba(255,255,255,0.55)" },
  tick: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  choiceText: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  choicePrice: { fontFamily: font.body, fontSize: 12, color: color.ink3 },
  pair: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 20, padding: 10 },
  pairImg: { width: 52, height: 52, borderRadius: 14 },
  pairName: { fontFamily: font.display, fontSize: 16, color: color.ink },
  pairPrice: { fontFamily: font.body, fontSize: 12.5, color: color.ink3, marginTop: 2 },
  pairAdd: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.ink, alignItems: "center", justifyContent: "center" },
  pairAddText: { fontFamily: font.bodyHeavy, fontSize: 19, color: color.paper, marginTop: -2 },
  top: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  round: { height: 42, minWidth: 42, borderRadius: 21, backgroundColor: "rgba(255,253,248,0.9)", alignItems: "center", justifyContent: "center" },
  roundText: { fontFamily: font.bodyHeavy, fontSize: 16, color: color.ink },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, alignItems: "center", paddingTop: 12, paddingHorizontal: 14, backgroundColor: color.night },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: color.night3, borderRadius: 999 },
  step: { width: 44, height: 50, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: font.bodyHeavy, fontSize: 20, color: color.paper },
  qty: { fontFamily: font.bodyHeavy, fontSize: 16, color: color.paper, minWidth: 18, textAlign: "center" },
  cta: { flex: 1, height: 52, borderRadius: 999, backgroundColor: color.palm, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.bodyHeavy, fontSize: 15, color: color.white },
  ctaSmall: { height: 52, paddingHorizontal: 20, borderRadius: 999, backgroundColor: color.palm, alignItems: "center", justifyContent: "center" },
  addedRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  addedText: { flex: 1, flexShrink: 1, fontFamily: font.bodyBold, fontSize: 14, color: color.plantain },
  ghost: { height: 52, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: color.night3, alignItems: "center", justifyContent: "center" },
  ghostText: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
});
