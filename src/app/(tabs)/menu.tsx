import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DishArt } from "@/art/DishArt";
import { Pressy } from "@/components/Pressy";
import { TopScrim } from "@/components/TopScrim";
import { money } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { categories, menu, signatures } from "@/lib/menu";
import { useOrder } from "@/lib/order";
import { color, font } from "@/lib/theme";

type Cat = (typeof categories)[number]["id"];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { addItem } = useOrder();
  const [cat, setCat] = useState<Cat>("all");
  const items = useMemo(() => menu.filter((m) => cat === "all" || m.category === cat), [cat]);
  const showSigs = cat === "all" || cat === "signature";
  const col = (width - 16 * 2 - 12) / 2;
  const sigW = Math.min(width * 0.62, 260);

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.eyebrow}>Lagos-born · World-fed</Text>
          <Text style={styles.h1}>The Menu</Text>
          <Text style={styles.lede}>Naija classics from the pot station, the world from the other side of the pass, and a belt of small chops in between.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => {
            const on = c.id === cat;
            return (
              <Pressy
                key={c.id}
                feel="tick"
                onPress={() => setCat(c.id)}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
              </Pressy>
            );
          })}
        </ScrollView>

        {showSigs && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Text style={styles.section}>The Table · build it your way</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={sigW + 14} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
              {signatures.map((s, i) => (
                <Animated.View key={s.slug} entering={FadeInDown.delay(i * 50)}>
                  <Pressy depth={0.97} onPress={() => router.push(`/dish/${s.slug}`)} style={[styles.sig, { width: sigW, backgroundColor: s.theme.bg }]} accessibilityLabel={`Customize ${s.name}`}>
                    <DishArt slug={s.slug} size={sigW - 36} style={{ alignSelf: "center" }} />
                    <Text style={[styles.sigEyebrow, { color: s.theme.accent }]}>{s.origin.city}</Text>
                    <Text style={[styles.sigName, { color: s.theme.deep }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <View style={styles.row}>
                      <Text style={[styles.sigPrice, { color: s.theme.deep }]}>{money(s.price)}</Text>
                      <Text style={[styles.sigCta, { color: s.theme.deep }]}>Customize →</Text>
                    </View>
                  </Pressy>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {cat !== "signature" && (
          <>
            <Text style={styles.section}>
              {items.length} {items.length === 1 ? "dish" : "dishes"}
            </Text>
            <View style={styles.grid}>
              {items.map((m) => (
                <Animated.View key={m.id} entering={FadeIn.duration(320)} exiting={FadeOut.duration(160)} layout={LinearTransition.springify().damping(18)} style={{ width: col }}>
                  <View style={styles.card}>
                    <Image source={m.image} style={{ width: col, height: col * 0.82 }} contentFit="cover" transition={200} />
                    <Pressy
                      feel="none"
                      onPress={() => addItem(m)}
                      style={styles.add}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${m.name} to order`}
                      hitSlop={8}
                    >
                      <Text style={styles.addText}>＋</Text>
                    </Pressy>
                  </View>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={2}>
                      {m.name}
                    </Text>
                    <Text style={styles.price}>{money(m.price)}</Text>
                  </View>
                  <Text style={styles.desc} numberOfLines={2}>
                    {m.desc}
                  </Text>
                  <Text style={styles.origin}>{m.origin}</Text>
                </Animated.View>
              ))}
            </View>
            <Pressy onPress={() => { haptic.tap(); router.push("/belt"); }} style={styles.beltCta}>
              <Text style={styles.beltEyebrow}>12:00 – 17:00 daily</Text>
              <Text style={styles.beltTitle}>Sushi & small chops on The Belt →</Text>
            </Pressy>
          </>
        )}
      </ScrollView>
      <TopScrim color={color.paper} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  head: { paddingHorizontal: 20, gap: 6, marginBottom: 14 },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2.2, color: color.palm, textTransform: "uppercase" },
  h1: { fontFamily: font.display, fontSize: 52, letterSpacing: -1.5, color: color.ink },
  lede: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink2 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: color.paper2 },
  chipOn: { backgroundColor: color.ink },
  chipText: { fontFamily: font.bodyBold, fontSize: 13.5, color: color.ink2 },
  chipTextOn: { color: color.paper },
  section: { fontFamily: font.bodyHeavy, fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: color.ink3, paddingHorizontal: 20, marginTop: 22, marginBottom: 12 },
  sig: { borderRadius: 28, padding: 18, gap: 4 },
  sigEyebrow: { fontFamily: font.bodyHeavy, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", marginTop: 10 },
  sigName: { fontFamily: font.display, fontSize: 24, letterSpacing: -0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  sigPrice: { fontFamily: font.display, fontSize: 18 },
  sigCta: { fontFamily: font.bodyBold, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, rowGap: 22, paddingHorizontal: 16 },
  card: { borderRadius: 22, overflow: "hidden", backgroundColor: color.paper2 },
  add: { position: "absolute", right: 10, bottom: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: color.paper, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  addText: { fontFamily: font.bodyHeavy, fontSize: 20, color: color.ink, marginTop: -2 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 10 },
  name: { fontFamily: font.display, fontSize: 17, color: color.ink, flex: 1, letterSpacing: -0.3 },
  price: { fontFamily: font.bodyBold, fontSize: 13.5, color: color.ink },
  desc: { fontFamily: font.body, fontSize: 12.5, lineHeight: 17, color: color.ink2, marginTop: 4 },
  origin: { fontFamily: font.bodyHeavy, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: color.ink3, marginTop: 6 },
  beltCta: { marginHorizontal: 16, marginTop: 30, backgroundColor: color.night, borderRadius: 28, padding: 24, gap: 6 },
  beltEyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: color.palm },
  beltTitle: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.paper },
});
