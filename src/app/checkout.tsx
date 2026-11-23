import { router } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressy } from "@/components/Pressy";
import { money, pad2 } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { nowMs, orderId } from "@/lib/ids";
import { AREAS, PAY, PROMOS, TIPS, site } from "@/lib/site";
import { cartSubtotal, useStore, type Order } from "@/lib/store";
import { color, font } from "@/lib/theme";

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(n * 70).duration(450)} style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.num}>
          <Text style={styles.numText}>{n}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

function Field({ label, error, shake, ...input }: TextInputProps & { label: string; error?: string; shake: number }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (shake && error) x.value = withSequence(withTiming(-8, { duration: 50 }), withSpring(0, { damping: 4, stiffness: 400 }));
  }, [shake, error, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ gap: 6 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={color.ink3} style={[styles.input, !!error && { borderColor: color.pepper }]} {...input} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Animated.View>
  );
}

function Chip({ on, onPress, children }: { on: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressy feel="tick" onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.chip, on && styles.chipOn]}>
      {children}
    </Pressy>
  );
}

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const cart = useStore((s) => s.cart);
  const placeOrder = useStore((s) => s.placeOrder);
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [area, setArea] = useState<(typeof AREAS)[number]["id"]>("lekki");
  const [slot, setSlot] = useState("asap");
  const [form, setForm] = useState({ address: "", note: "", name: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(0);
  const [tip, setTip] = useState<number>(10);
  const [pay, setPay] = useState("pod");
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [placing, setPlacing] = useState(false);
  const [slots] = useState(() => {
    const now = new Date(nowMs());
    const start = new Date(now);
    start.setMinutes(Math.ceil((now.getMinutes() + 35) / 15) * 15, 0, 0);
    return [{ id: "asap", label: "ASAP · ~20 min" }, ...Array.from({ length: 5 }, (_, i) => {
      const t = new Date(start.getTime() + i * 15 * 60000);
      return { id: t.toISOString(), label: `${pad2(t.getHours())}:${pad2(t.getMinutes())}` };
    })];
  });

  const a = AREAS.find((x) => x.id === area)!;
  const sub = cartSubtotal(cart);
  const discount = applied ? Math.round(sub * PROMOS[applied]) : 0;
  const delivery = mode === "delivery" ? (sub - discount >= site.freeDeliveryFrom ? 0 : a.fee) : 0;
  const vat = Math.round((sub - discount) * site.vat);
  const tipAmt = Math.round((sub - discount) * (tip / 100));
  const total = sub - discount + delivery + vat + tipAmt;

  // the sliding pill behind Delivery / Pickup
  const pill = useSharedValue(0);
  useEffect(() => {
    pill.value = withSpring(mode === "delivery" ? 0 : 1, { damping: 18, stiffness: 220 });
  }, [mode, pill]);
  const pillStyle = useAnimatedStyle(() => ({ left: `${pill.value * 50}%` }));

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChangeText: (t: string) => {
      setForm((f) => ({ ...f, [k]: t }));
      if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
    },
  });

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (PROMOS[code]) {
      setApplied(code);
      setPromoMsg(`${code} applied: ${PROMOS[code] * 100}% off. Enjoy.`);
      haptic.success();
    } else {
      setApplied(null);
      setPromoMsg("That code isn't on the menu. Try JOLLOF10.");
      haptic.warn();
    }
  };

  const submit = () => {
    if (placing) return;
    const er: Record<string, string> = {};
    if (form.name.trim().length < 2) er.name = "Who should we shout for?";
    if (!/^[0-9+\s-]{7,}$/.test(form.phone.trim())) er.phone = "We need a number the rider can call.";
    if (mode === "delivery" && form.address.trim().length < 6) er.address = "Where should the jollof land?";
    setErrors(er);
    if (Object.keys(er).length) {
      setShake((s) => s + 1);
      haptic.warn();
      return;
    }
    setPlacing(true);
    haptic.thud();
    setTimeout(() => {
      const order: Order = {
        id: orderId(),
        lines: cart,
        total,
        mode,
        name: form.name.trim().split(" ")[0],
        area: mode === "delivery" ? a.label : undefined,
        eta: mode === "delivery" ? a.eta : 20,
        placedAt: nowMs(),
      };
      placeOrder(order);
      haptic.success();
      router.replace("/order");
    }, 1400);
  };

  const rows = useMemo(
    () => [
      ["Subtotal", money(sub)],
      ...(discount ? [[`Promo ${applied}`, `−${money(discount)}`]] : []),
      [mode === "delivery" ? `Delivery · ${a.label}` : "Pickup", delivery ? money(delivery) : "Free"],
      [`VAT (${site.vat * 100}%)`, money(vat)],
      [`Kitchen tip (${tip}%)`, money(tipAmt)],
    ],
    [sub, discount, applied, mode, a.label, delivery, vat, tip, tipAmt],
  );

  if (cart.length === 0 && !placing) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.h1}>Nothing to check out</Text>
        <Pressy onPress={() => router.replace("/menu")} style={[styles.place, { alignSelf: "center", paddingHorizontal: 28 }]}>
          <Text style={styles.placeText}>See the menu</Text>
        </Pressy>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 120, paddingHorizontal: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Checkout</Text>

        <Section n={1} title={mode === "delivery" ? "Where to?" : "When?"}>
          <View style={styles.toggle}>
            <Animated.View style={[styles.pill, pillStyle]} />
            {(["delivery", "pickup"] as const).map((m) => (
              <Pressy key={m} feel="tick" onPress={() => setMode(m)} style={styles.toggleBtn} accessibilityRole="radio" accessibilityState={{ checked: mode === m }}>
                <Text style={[styles.toggleText, mode === m && { color: color.paper }]}>{m === "delivery" ? "🛵 Delivery" : "🥡 Pickup"}</Text>
              </Pressy>
            ))}
          </View>
          {mode === "delivery" ? (
            <Animated.View entering={FadeIn} style={{ gap: 14 }}>
              <View style={styles.chips}>
                {AREAS.map((x) => (
                  <Chip key={x.id} on={area === x.id} onPress={() => setArea(x.id)}>
                    <Text style={[styles.chipTitle, area === x.id && { color: color.paper }]}>{x.label}</Text>
                    <Text style={[styles.chipSub, area === x.id && { color: color.paper3 }]}>
                      {money(x.fee)} · {x.eta} min
                    </Text>
                  </Chip>
                ))}
              </View>
              <Field label="Street address" placeholder="House number, street, landmark" autoComplete="street-address" error={errors.address} shake={shake} {...field("address")} />
              <Field label="Note for the rider (optional)" placeholder="e.g. Call at the gate, blue door" {...field("note")} shake={0} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} style={styles.chips}>
              {slots.map((s) => (
                <Chip key={s.id} on={slot === s.id} onPress={() => setSlot(s.id)}>
                  <Text style={[styles.chipTitle, slot === s.id && { color: color.paper }]}>{s.label}</Text>
                </Chip>
              ))}
            </Animated.View>
          )}
        </Section>

        <Section n={2} title="Who's eating?">
          <Field label="Full name" placeholder="Adaeze Okafor" autoComplete="name" error={errors.name} shake={shake} {...field("name")} />
          <Field label="Phone" placeholder="+234 801 234 5678" autoComplete="tel" keyboardType="phone-pad" error={errors.phone} shake={shake} {...field("phone")} />
        </Section>

        <Section n={3} title="Tip the kitchen">
          <View style={styles.chips}>
            {TIPS.map((t) => (
              <Chip key={t} on={tip === t} onPress={() => setTip(t)}>
                <Text style={[styles.chipTitle, tip === t && { color: color.paper }]}>{t === 0 ? "Not today" : `${t}%`}</Text>
              </Chip>
            ))}
          </View>
        </Section>

        <Section n={4} title="Payment">
          {PAY.map((p) => (
            <Pressy key={p.id} feel="tick" onPress={() => setPay(p.id)} accessibilityRole="radio" accessibilityState={{ checked: pay === p.id }} style={[styles.payRow, pay === p.id && styles.payOn]}>
              <View style={[styles.radio, pay === p.id && { borderColor: color.palm }]}>{pay === p.id ? <View style={styles.radioDot} /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payTitle}>{p.title}</Text>
                <Text style={styles.paySub}>{p.sub}</Text>
              </View>
            </Pressy>
          ))}
        </Section>

        <Animated.View entering={FadeInDown.delay(350)} style={styles.summary}>
          <View style={styles.promoRow}>
            <TextInput value={promo} onChangeText={setPromo} placeholder="Promo code" placeholderTextColor={color.ink3} autoCapitalize="characters" style={[styles.input, styles.promoInput]} onSubmitEditing={applyPromo} />
            <Pressy onPress={applyPromo} style={styles.apply}>
              <Text style={styles.applyText}>Apply</Text>
            </Pressy>
          </View>
          {promoMsg ? <Text style={[styles.promoMsg, { color: applied ? color.leaf : color.pepper }]}>{promoMsg}</Text> : null}
          {rows.map(([k, v]) => (
            <View key={k} style={styles.sumRow}>
              <Text style={styles.sumKey}>{k}</Text>
              <Text style={styles.sumVal}>{v}</Text>
            </View>
          ))}
          <View style={[styles.sumRow, styles.totalRow]}>
            <Text style={styles.totalKey}>Total</Text>
            <Text style={styles.totalVal}>{money(total)}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressy onPress={() => router.back()} style={styles.round} accessibilityLabel="Back">
          <Text style={styles.roundText}>←</Text>
        </Pressy>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        <Pressy feel="none" onPress={submit} style={[styles.place, placing && { backgroundColor: color.ink2 }]} accessibilityRole="button">
          <Text style={styles.placeText}>{placing ? "Sending to the kitchen…" : `Place order · ${money(total)}`}</Text>
        </Pressy>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper2 },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  h1: { fontFamily: font.display, fontSize: 46, letterSpacing: -1.4, color: color.ink },
  section: { backgroundColor: color.paper, borderRadius: 26, padding: 18, gap: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.ink, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: font.bodyHeavy, fontSize: 12, color: color.paper },
  sectionTitle: { fontFamily: font.display, fontSize: 26, color: color.ink },
  toggle: { flexDirection: "row", backgroundColor: color.paper2, borderRadius: 999, padding: 4 },
  pill: { position: "absolute", top: 4, bottom: 4, width: "50%", borderRadius: 999, backgroundColor: color.ink, marginLeft: 0 },
  toggleBtn: { flex: 1, height: 42, alignItems: "center", justifyContent: "center" },
  toggleText: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: color.paper2 },
  chipOn: { backgroundColor: color.ink },
  chipTitle: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  chipSub: { fontFamily: font.body, fontSize: 11.5, color: color.ink3, marginTop: 1 },
  fieldLabel: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", color: color.ink3 },
  input: { height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: color.paper3, backgroundColor: color.white, paddingHorizontal: 14, fontFamily: font.body, fontSize: 15.5, color: color.ink },
  error: { fontFamily: font.bodyBold, fontSize: 12.5, color: color.pepper },
  payRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: color.paper3 },
  payOn: { borderColor: color.palm, backgroundColor: "rgba(226,98,27,0.06)" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.paper3, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.palm },
  payTitle: { fontFamily: font.bodyBold, fontSize: 14.5, color: color.ink },
  paySub: { fontFamily: font.body, fontSize: 12, color: color.ink3, marginTop: 2 },
  summary: { backgroundColor: color.night, borderRadius: 26, padding: 18, gap: 10 },
  promoRow: { flexDirection: "row", gap: 8 },
  promoInput: { flex: 1, backgroundColor: color.night2, borderColor: color.night3, color: color.paper },
  apply: { height: 50, paddingHorizontal: 18, borderRadius: 16, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  applyText: { fontFamily: font.bodyHeavy, fontSize: 14, color: color.ink },
  promoMsg: { fontFamily: font.bodyBold, fontSize: 12.5 },
  sumRow: { flexDirection: "row", justifyContent: "space-between" },
  sumKey: { fontFamily: font.body, fontSize: 14, color: color.paper3 },
  sumVal: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.night3, paddingTop: 12, marginTop: 4 },
  totalKey: { fontFamily: font.display, fontSize: 22, color: color.paper },
  totalVal: { fontFamily: font.display, fontSize: 26, color: color.plantain },
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: 16 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,253,248,0.92)", alignItems: "center", justifyContent: "center" },
  roundText: { fontFamily: font.bodyHeavy, fontSize: 16, color: color.ink },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, backgroundColor: color.paper2 },
  place: { height: 54, borderRadius: 999, backgroundColor: color.palm, alignItems: "center", justifyContent: "center" },
  placeText: { fontFamily: font.bodyHeavy, fontSize: 15.5, color: color.white },
});
