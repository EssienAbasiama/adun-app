/**
 * Reserve: an envelope that opens itself; the letter becomes a five-step booking
 * (guests, date, time, a tappable floor plan, details) and is sealed with wax.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeIn, FadeInRight, FadeOutLeft, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { rng } from "@/art/kit";
import { Pressy } from "@/components/Pressy";
import { pad2 } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { nowMs, reservationCode } from "@/lib/ids";
import { useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";

type Zone = { id: string; name: string; seats: string; vibe: string; min?: number; max?: number };
const ZONES: Zone[] = [
  { id: "belt", name: "The Belt Bar", seats: "Counter seats, 1–4", vibe: "Plates glide past your elbow. Best for sushi and people-watching.", max: 4 },
  { id: "main", name: "Main Room", seats: "Tables for 2–8", vibe: "Candlelight, clinking glasses, jollof arriving in waves.", max: 8 },
  { id: "garden", name: "Garden Terrace", seats: "Tables for 2–6", vibe: "Fairy lights, ferns and the Lagos breeze.", max: 6 },
  { id: "chef", name: "Chef's Table", seats: "Up to 6, tasting menu", vibe: "Front row at the pass. Off-menu bites.", max: 6 },
  { id: "owambe", name: "Owambe Room", seats: "Private, 6–14", vibe: "For celebrations. Aso-ebi optional, dancing encouraged.", min: 6 },
];
const allowed = (z: Zone, g: number) => (z.min ? g >= z.min : true) && (z.max ? g <= z.max : true);
const STEPS = ["Guests", "Date", "Time", "Seat", "Details"];
const OCCASIONS = ["Just hungry", "Birthday", "Anniversary", "Date night", "Business", "Owambe"];
const LUNCH = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00"];
const DINNER = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Stable pseudo-availability, same as the website: a date/time always looks the same. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return rng(h >>> 0)();
};

function WaxSeal({ size = 92 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 4 C64 6 70 2 78 12 C90 18 96 30 94 44 C99 58 92 70 84 80 C74 92 60 96 48 95 C34 98 22 90 14 80 C4 70 2 56 6 44 C3 30 12 16 24 10 C32 4 40 6 50 4 Z" fill="#B8241A" />
      <Circle cx="50" cy="50" r="33" fill="#C8301F" stroke="#8E1A10" strokeWidth="2" />
      <Circle cx="50" cy="50" r="27" fill="none" stroke="#E25A40" strokeOpacity="0.5" strokeWidth="1.5" />
      <SvgText x="50" y="62" textAnchor="middle" fontSize="34" fontFamily={font.display} fill="#7E150C">
        À
      </SvgText>
      <Path d="M30 28 C36 22 46 20 52 22" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** An envelope whose flap opens (3D, hinged at the top) and closes. */
function Envelope({ open, width, children }: { open: boolean; width: number; children?: ReactNode }) {
  const h = width * 0.66;
  const flap = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    flap.value = withTiming(open ? 1 : 0, { duration: 650, easing: Easing.inOut(Easing.cubic) });
  }, [open, flap]);
  const flapStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateX: `${flap.value * 178}deg` }],
    zIndex: flap.value > 0.5 ? 0 : 3,
  }));
  return (
    <View style={{ width, height: h }}>
      <View style={[styles.envBack, { borderRadius: 16 }]} />
      {children}
      <View style={[styles.envFront, { borderRadius: 16 }]} pointerEvents="none">
        <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
          {/* side panels run up to the top corners, so a sealed letter is fully hidden */}
          <Path d={`M0 0 L${width / 2} ${h * 0.6} L${width} 0 V${h} H0 Z`} fill="#EAD9BC" />
          <Path d={`M0 ${h} L${width / 2} ${h * 0.55} L${width} ${h}`} fill="#E2CFAE" />
        </Svg>
      </View>
      <Animated.View style={[styles.flap, { width, height: h * 0.62, transformOrigin: "top" }, flapStyle]} pointerEvents="none">
        <Svg width={width} height={h * 0.62} viewBox={`0 0 ${width} ${h * 0.62}`}>
          <Path d={`M0 0 H${width} L${width / 2} ${h * 0.62} Z`} fill="#DCC7A3" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Chip({ on, off, onPress, children }: { on: boolean; off?: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressy feel="tick" disabled={off} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: off }} style={[styles.chip, on && styles.chipOn, off && { opacity: 0.3 }]}>
      {children}
    </Pressy>
  );
}

function FloorPlan({ value, guests, onPick }: { value: string; guests: number; onPick: (id: string) => void }) {
  const Z = ({ id, style, tint }: { id: string; style: object; tint: string }) => {
    const z = ZONES.find((x) => x.id === id)!;
    const ok = allowed(z, guests);
    const on = value === id;
    return (
      <Pressy feel="tick" disabled={!ok} onPress={() => onPick(id)} accessibilityLabel={`${z.name}, ${z.seats}`} accessibilityState={{ selected: on, disabled: !ok }} style={[styles.zone, style, { backgroundColor: tint }, on && styles.zoneOn, !ok && { opacity: 0.32 }]}>
        <Text style={[styles.zoneName, on && { color: color.palm }]}>{z.name}</Text>
        <View style={styles.tables}>
          {Array.from({ length: id === "belt" ? 7 : id === "owambe" ? 1 : 4 }, (_, i) => (
            <View key={i} style={[id === "belt" ? styles.stool : id === "owambe" ? styles.longTable : styles.table, on && { backgroundColor: color.palm }]} />
          ))}
        </View>
      </Pressy>
    );
  };
  return (
    <View style={styles.plan}>
      <Z id="belt" tint="#EFE6D6" style={{ left: "3%", right: "3%", top: "3%", height: "20%" }} />
      <Z id="main" tint="#F4ECDF" style={{ left: "3%", width: "55%", top: "26%", height: "44%" }} />
      <Z id="garden" tint="#E3EEDB" style={{ right: "3%", width: "36%", top: "26%", height: "44%" }} />
      <Z id="chef" tint="#F1E2CF" style={{ left: "3%", width: "45%", top: "73%", height: "24%" }} />
      <Z id="owambe" tint="#E2E4F0" style={{ right: "3%", width: "46%", top: "73%", height: "24%" }} />
    </View>
  );
}

export default function ReserveScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const save = useStore((s) => s.saveReservation);
  const [phase, setPhase] = useState<"intro" | "form" | "sealing" | "sealed">("intro");
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [seat, setSeat] = useState("main");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [occasion, setOccasion] = useState("Just hungry");
  const [code, setCode] = useState("");
  const days = useMemo(() => {
    const now = new Date(nowMs());
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const r = hash(iso);
      return { iso, dow: i === 0 ? "Today" : DOW[d.getDay()], d: d.getDate(), mon: MON[d.getMonth()], full: i > 0 && r < 0.12 };
    });
  }, []);
  const [date, setDate] = useState(days[0].iso);
  const zone = ZONES.find((z) => z.id === seat)!;
  const zoneOk = allowed(zone, guests);
  const slot = (t: string) => {
    const r = hash(`${date}|${t}`);
    return { full: r < 0.22, last: r > 0.82 };
  };
  const day = days.find((d) => d.iso === date)!;
  const envW = Math.min(width - 48, 380);

  // the intro: the envelope opens itself, then the letter rises out of it
  const lift = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p === "intro" ? "form" : p)), 1500);
    lift.value = withDelay(650, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    return () => clearTimeout(t);
  }, [lift]);
  const letter = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 70 }] }));

  // sealing: the card goes back in, the flap closes, the wax stamps down
  const stamp = useSharedValue(0);
  const stampStyle = useAnimatedStyle(() => ({ opacity: stamp.value === 0 ? 0 : 1, transform: [{ scale: 2.4 - stamp.value * 1.4 }, { rotate: `${(1 - stamp.value) * -25}deg` }] }));

  const canNext = () => (step === 2 ? !!time : step === 3 ? zoneOk : step === 4 ? form.name.trim().length > 1 && form.phone.trim().length > 6 : true);
  const next = () => {
    if (!canNext()) {
      haptic.warn();
      return;
    }
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    const c = reservationCode();
    setCode(c);
    setPhase("sealing");
    lift.value = withTiming(0, { duration: 500 });
    setTimeout(() => {
      stamp.value = withSequence(withTiming(1, { duration: 260, easing: Easing.in(Easing.cubic) }), withSpring(1));
      haptic.stamp();
      setTimeout(() => {
        save({ code: c, guests, date, time, seat: zone.name, name: form.name.trim(), occasion });
        setPhase("sealed");
      }, 700);
    }, 1100);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110, alignItems: "center" }} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>Reservations</Text>
      <Text style={styles.h1}>{phase === "sealed" ? "Sealed. See you soon." : "You're invited."}</Text>

      {phase === "form" ? (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.card, { width: width - 32 }]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardEyebrow}>A table at Àdùn · {STEPS[step]}</Text>
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i <= step && { backgroundColor: color.palm, width: i === step ? 22 : 8 }]} />
              ))}
            </View>
          </View>

          <Animated.View key={step} entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(160)} style={{ gap: 14 }}>
            {step === 0 && (
              <>
                <Text style={styles.q}>How many of you?</Text>
                <View style={styles.guests}>
                  <Pressy feel="tick" onPress={() => setGuests((g) => Math.max(1, g - 1))} style={styles.gBtn} accessibilityLabel="Fewer guests">
                    <Text style={styles.gBtnText}>−</Text>
                  </Pressy>
                  <Animated.Text key={guests} entering={ZoomIn.springify()} style={styles.gNum}>
                    {guests}
                  </Animated.Text>
                  <Pressy feel="tick" onPress={() => setGuests((g) => Math.min(14, g + 1))} style={[styles.gBtn, { backgroundColor: color.ink }]} accessibilityLabel="More guests">
                    <Text style={[styles.gBtnText, { color: color.paper }]}>+</Text>
                  </Pressy>
                </View>
                <View style={styles.plates}>
                  {Array.from({ length: Math.min(guests, 14) }, (_, i) => (
                    <Animated.View key={i} entering={ZoomIn.springify().damping(10)} style={styles.guestPlate}>
                      <View style={[styles.guestDot, { backgroundColor: ["#E2621B", "#F2B23A", "#2E5B3A", "#C3301E"][i % 4] }]} />
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
            {step === 1 && (
              <>
                <Text style={styles.q}>Which day?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {days.map((d) => (
                    <Chip key={d.iso} on={date === d.iso} off={d.full} onPress={() => setDate(d.iso)}>
                      <Text style={[styles.dayDow, date === d.iso && { color: color.paper3 }]}>{d.dow}</Text>
                      <Text style={[styles.dayNum, date === d.iso && { color: color.paper }, d.full && { textDecorationLine: "line-through" }]}>{d.d}</Text>
                      <Text style={[styles.dayDow, date === d.iso && { color: color.paper3 }]}>{d.mon}</Text>
                    </Chip>
                  ))}
                </ScrollView>
                <Text style={styles.note}>Crossed-out days are fully booked. We hold a few counter seats for walk-ins every day.</Text>
              </>
            )}
            {step === 2 && (
              <>
                <Text style={styles.q}>What time?</Text>
                {[["Lunch", LUNCH], ["Dinner", DINNER]].map(([label, list]) => (
                  <View key={label as string} style={{ gap: 8 }}>
                    <Text style={styles.slotLabel}>{label as string}</Text>
                    <View style={styles.wrap}>
                      {(list as string[]).map((t) => {
                        const s = slot(t);
                        return (
                          <Chip key={t} on={time === t} off={s.full} onPress={() => setTime(t)}>
                            <Text style={[styles.slotText, time === t && { color: color.paper }]}>{t}</Text>
                            {s.last && !s.full ? <Text style={styles.last}>last table</Text> : null}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </>
            )}
            {step === 3 && (
              <>
                <Text style={styles.q}>Where would you like to sit?</Text>
                <FloorPlan value={seat} guests={guests} onPick={setSeat} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneTitle}>{zone.name}</Text>
                  <Text style={styles.zoneSeats}>{zone.seats}</Text>
                  <Text style={styles.zoneVibe}>{zone.vibe}</Text>
                  {!zoneOk ? <Text style={styles.err}>Not available for {guests} guests.</Text> : null}
                </View>
              </>
            )}
            {step === 4 && (
              <>
                <Text style={styles.q}>Last thing: who's coming?</Text>
                <TextInput value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="Name on the booking" placeholderTextColor={color.ink3} autoComplete="name" style={styles.input} />
                <TextInput value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} placeholder="Phone" placeholderTextColor={color.ink3} keyboardType="phone-pad" autoComplete="tel" style={styles.input} />
                <Text style={styles.slotLabel}>What's the occasion?</Text>
                <View style={styles.wrap}>
                  {OCCASIONS.map((o) => (
                    <Chip key={o} on={occasion === o} onPress={() => setOccasion(o)}>
                      <Text style={[styles.slotText, occasion === o && { color: color.paper }]}>{o}</Text>
                    </Chip>
                  ))}
                </View>
              </>
            )}
          </Animated.View>

          <View style={styles.nav}>
            <Pressy disabled={step === 0} onPress={() => setStep((s) => Math.max(0, s - 1))} style={[styles.back, step === 0 && { opacity: 0.3 }]}>
              <Text style={styles.backText}>← Back</Text>
            </Pressy>
            <Text style={styles.summary} numberOfLines={1}>
              {guests} · {day.dow} {day.d} {day.mon}
              {time ? ` · ${time}` : ""}
            </Text>
            <Pressy feel="none" onPress={next} style={[styles.next, step === 4 && { backgroundColor: color.palm }, !canNext() && { opacity: 0.45 }]}>
              <Text style={styles.nextText}>{step === 4 ? "Seal it" : "Continue"} →</Text>
            </Pressy>
          </View>
        </Animated.View>
      ) : (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Envelope open={phase === "intro"} width={envW}>
            <Animated.View style={[styles.letter, letter]}>
              <Text style={styles.letterTitle}>{phase === "intro" ? "A table at Àdùn" : form.name || "Your table"}</Text>
              <Text style={styles.letterSub}>{phase === "intro" ? "Breaking the seal…" : `Table for ${guests} · ${time}`}</Text>
            </Animated.View>
          </Envelope>
          <Animated.View style={[styles.seal, { top: envW * 0.66 * 0.56 - 46 }, stampStyle]} pointerEvents="none">
            <WaxSeal />
          </Animated.View>
          {phase === "sealed" && (
            <Animated.View entering={FadeIn.delay(200)} style={styles.sealed}>
              <Text style={styles.cardEyebrow}>Sealed · {code}</Text>
              <Text style={styles.sealedTitle}>
                {day.dow} {day.d} {day.mon}, {time}
              </Text>
              <Text style={styles.zoneVibe}>
                {guests} {guests === 1 ? "guest" : "guests"} · {zone.name} · {occasion}
              </Text>
              <Pressy
                onPress={() => {
                  setStep(0);
                  setTime("");
                  stamp.value = 0;
                  setPhase("form");
                }}
                style={[styles.next, { alignSelf: "flex-start", marginTop: 8 }]}
              >
                <Text style={styles.nextText}>Book another table</Text>
              </Pressy>
            </Animated.View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3E7DA" },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2.2, color: color.palm, textTransform: "uppercase" },
  h1: { fontFamily: font.display, fontSize: 42, letterSpacing: -1.2, color: color.ink, marginTop: 4, textAlign: "center", paddingHorizontal: 16 },
  envBack: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#D8C29C" },
  envFront: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden", zIndex: 2 },
  flap: { position: "absolute", left: 0, top: 0 },
  letter: { position: "absolute", left: "8%", right: "8%", top: "10%", height: "70%", backgroundColor: "#FFFDF7", borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 4, zIndex: 1, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  letterTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  letterSub: { fontFamily: font.bodyHeavy, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: color.ink3 },
  seal: { position: "absolute", alignSelf: "center", zIndex: 10 },
  sealed: { marginTop: 28, alignSelf: "stretch", marginHorizontal: 24, gap: 6 },
  sealedTitle: { fontFamily: font.display, fontSize: 28, color: color.ink },
  card: { marginTop: 18, backgroundColor: "#FFFDF7", borderRadius: 28, padding: 18, gap: 16, shadowColor: "#3A2410", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardEyebrow: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 1.8, textTransform: "uppercase", color: color.palm },
  dots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.paper3 },
  q: { fontFamily: font.display, fontSize: 28, color: color.ink, letterSpacing: -0.5 },
  guests: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 26 },
  gBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.paper2, alignItems: "center", justifyContent: "center" },
  gBtnText: { fontFamily: font.bodyHeavy, fontSize: 24, color: color.ink },
  gNum: { fontFamily: font.display, fontSize: 64, color: color.ink, minWidth: 60, textAlign: "center" },
  plates: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, minHeight: 44 },
  guestPlate: { width: 38, height: 38, borderRadius: 19, borderWidth: 5, borderColor: "#2A4A9A", backgroundColor: color.white, alignItems: "center", justifyContent: "center" },
  guestDot: { width: 11, height: 11, borderRadius: 6 },
  chip: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 16, backgroundColor: color.paper2, alignItems: "center" },
  chipOn: { backgroundColor: color.ink },
  dayDow: { fontFamily: font.bodyHeavy, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: color.ink3 },
  dayNum: { fontFamily: font.display, fontSize: 24, color: color.ink, marginVertical: 1 },
  note: { fontFamily: font.body, fontSize: 12.5, color: color.ink3, lineHeight: 18 },
  slotLabel: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", color: color.ink3 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotText: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  last: { fontFamily: font.bodyHeavy, fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase", color: color.palm, marginTop: 2 },
  plan: { width: "100%", aspectRatio: 1 / 1.05, backgroundColor: "#FBF7EF", borderRadius: 20, borderWidth: 2, borderColor: "#D9CDB8" },
  zone: { position: "absolute", borderRadius: 14, padding: 8, justifyContent: "space-between", borderWidth: 2, borderColor: "transparent" },
  zoneOn: { borderColor: color.palm },
  zoneName: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", color: color.ink2 },
  tables: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  table: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#D6CAB6" },
  stool: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#D6CAB6" },
  longTable: { width: "80%", height: 14, borderRadius: 7, backgroundColor: "#C9CDE2" },
  zoneInfo: { gap: 3 },
  zoneTitle: { fontFamily: font.display, fontSize: 22, color: color.ink },
  zoneSeats: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: color.palm },
  zoneVibe: { fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: color.ink2 },
  err: { fontFamily: font.bodyBold, fontSize: 13, color: color.pepper, marginTop: 4 },
  input: { height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: color.paper3, backgroundColor: color.white, paddingHorizontal: 14, fontFamily: font.body, fontSize: 15.5, color: color.ink },
  nav: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: { paddingVertical: 10, paddingHorizontal: 4 },
  backText: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink2 },
  summary: { flex: 1, fontFamily: font.body, fontSize: 12, color: color.ink3, textAlign: "center" },
  next: { height: 46, paddingHorizontal: 18, borderRadius: 999, backgroundColor: color.ink, alignItems: "center", justifyContent: "center" },
  nextText: { fontFamily: font.bodyHeavy, fontSize: 14, color: color.paper },
});
