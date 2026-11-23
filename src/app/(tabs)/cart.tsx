import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOutLeft, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { Pressy } from "@/components/Pressy";
import { Thumb } from "@/components/Thumb";
import { money } from "@/lib/format";
import { site } from "@/lib/site";
import { cartCount, cartSubtotal, useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";

function EmptyPlate({ size = 200 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Ellipse cx="104" cy="112" rx="86" ry="84" fill="#000" opacity="0.07" />
      <Circle cx="100" cy="100" r="86" fill="#FBF8F2" stroke="#E3DACB" strokeWidth="2" />
      <Circle cx="100" cy="100" r="62" fill="none" stroke="#E9E1D4" strokeWidth="2" />
      <Path d="M70 118 c10 6 22 7 34 2" stroke="#E2621B" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M150 40 l-60 90" stroke="#B9A88E" strokeWidth="5" strokeLinecap="round" />
      <Path d="M160 48 l-60 90" stroke="#C9B89E" strokeWidth="5" strokeLinecap="round" />
      <Circle cx="76" cy="112" r="2.4" fill="#E2621B" />
      <Circle cx="86" cy="124" r="1.8" fill="#E2621B" />
    </Svg>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useStore((s) => s.cart);
  const order = useStore((s) => s.order);
  const setQty = useStore((s) => s.setQty);
  const sub = cartSubtotal(cart);
  const left = Math.max(0, site.freeDeliveryFrom - sub);
  const pct = Math.min(1, sub / site.freeDeliveryFrom);
  const live = order && Date.now() - order.placedAt < 45 * 60 * 1000;

  const bar = useSharedValue(pct);
  useEffect(() => {
    bar.value = withSpring(pct, { damping: 18, stiffness: 120 });
  }, [pct, bar]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 190, paddingHorizontal: 16 }}>
        <Text style={styles.eyebrow}>Your order</Text>
        <Text style={styles.h1}>
          {cartCount(cart)} {cartCount(cart) === 1 ? "plate" : "plates"}
        </Text>

        {live && order ? (
          <Pressy onPress={() => router.push("/order")} style={styles.live}>
            <View style={styles.liveDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.liveTitle}>Order {order.id} is on its way</Text>
              <Text style={styles.liveSub}>Tap to watch it cross {order.area ?? "Lagos"}</Text>
            </View>
            <Text style={styles.liveArrow}>→</Text>
          </Pressy>
        ) : null}

        {cart.length === 0 ? (
          <Animated.View entering={FadeIn} style={styles.empty}>
            <EmptyPlate />
            <Text style={styles.emptyTitle}>Your plate is clean.</Text>
            <Text style={styles.emptySub}>Spin the table or grab something off the belt.</Text>
            <Pressy onPress={() => router.push("/")} style={styles.cta}>
              <Text style={styles.ctaText}>Back to the table</Text>
            </Pressy>
          </Animated.View>
        ) : (
          <>
            <View style={styles.free}>
              <Text style={styles.freeText}>
                {left > 0 ? (
                  <>
                    Add <Text style={{ color: color.palm, fontFamily: font.bodyHeavy }}>{money(left)}</Text> more for free delivery
                  </>
                ) : (
                  "Delivery is on us 🎉"
                )}
              </Text>
              <View style={styles.track}>
                <Animated.View style={[styles.fill, barStyle]} />
              </View>
            </View>

            {cart.map((l) => (
              <Animated.View key={l.key} exiting={FadeOutLeft.duration(220)} layout={LinearTransition.springify().damping(18)} style={styles.line}>
                <Thumb thumb={l.thumb} size={58} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {l.name}
                  </Text>
                  {l.meta ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {l.meta}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>{money(l.unit * l.qty)}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressy feel="tick" onPress={() => setQty(l.key, l.qty - 1)} style={styles.step} accessibilityLabel={`Remove one ${l.name}`}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressy>
                  <Text style={styles.qty}>{l.qty}</Text>
                  <Pressy feel="tick" onPress={() => setQty(l.key, l.qty + 1)} style={styles.step} accessibilityLabel={`Add one ${l.name}`}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressy>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <Animated.View entering={FadeIn} style={[styles.bar, { bottom: insets.bottom + 70 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Subtotal</Text>
            <Text style={styles.sub}>{money(sub)}</Text>
          </View>
          <Pressy onPress={() => router.push("/checkout")} style={[styles.cta, { marginTop: 0 }]} accessibilityRole="button">
            <Text style={styles.ctaText}>Checkout →</Text>
          </Pressy>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2.2, color: color.palm, textTransform: "uppercase" },
  h1: { fontFamily: font.display, fontSize: 48, letterSpacing: -1.4, color: color.ink, marginBottom: 14 },
  live: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.ink, borderRadius: 22, padding: 16, marginBottom: 16 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.plantain },
  liveTitle: { fontFamily: font.bodyBold, fontSize: 14.5, color: color.paper },
  liveSub: { fontFamily: font.body, fontSize: 12.5, color: color.paper3, marginTop: 2 },
  liveArrow: { fontFamily: font.bodyHeavy, fontSize: 18, color: color.plantain },
  empty: { alignItems: "center", paddingTop: 30, gap: 8 },
  emptyTitle: { fontFamily: font.display, fontSize: 30, color: color.ink, marginTop: 10 },
  emptySub: { fontFamily: font.body, fontSize: 15, color: color.ink2, textAlign: "center" },
  free: { backgroundColor: color.paper2, borderRadius: 20, padding: 16, gap: 10, marginBottom: 14 },
  freeText: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(29,20,16,0.1)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.palm },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.paper3 },
  name: { fontFamily: font.display, fontSize: 17, color: color.ink },
  meta: { fontFamily: font.body, fontSize: 12, color: color.ink3, marginTop: 2 },
  price: { fontFamily: font.bodyBold, fontSize: 13.5, color: color.ink, marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: color.paper2, borderRadius: 999 },
  step: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: font.bodyHeavy, fontSize: 18, color: color.ink },
  qty: { fontFamily: font.bodyHeavy, fontSize: 14, color: color.ink, minWidth: 14, textAlign: "center" },
  bar: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.ink, borderRadius: 26, paddingVertical: 14, paddingLeft: 20, paddingRight: 12 },
  subLabel: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: color.paper3 },
  sub: { fontFamily: font.display, fontSize: 24, color: color.paper },
  cta: { marginTop: 16, height: 50, paddingHorizontal: 22, borderRadius: 999, backgroundColor: color.palm, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.bodyHeavy, fontSize: 15, color: color.white },
});
