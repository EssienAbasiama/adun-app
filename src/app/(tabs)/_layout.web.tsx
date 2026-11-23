/**
 * Web-only tab bar (native tabs don't exist in the browser). Used for the browser preview
 * and for recording the app's showcase video: a floating, frosted pill like iOS's bar.
 */
import { Tabs, router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Pressy } from "@/components/Pressy";
import { cartCount, useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONS: Record<string, (c: string) => React.ReactNode> = {
  index: (c) => <Path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5m4-5v5M17 3c-2 0-3 2.5-3 6s1.5 4 3 4v8" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />,
  menu: (c) => <Path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zm3 4h7M8 12h7M5 17a3 3 0 0 1 3-3h11" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  belt: (c) => <Path d="M3 12c3-5 8-6 12-3l4-3v12l-4-3c-4 3-9 2-12-3zm13-0.5h.01" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  reserve: (c) => <Path d="M3 6h18v12H3zM3 7l9 6 9-6" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  cart: (c) => <Path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8zM9 8a3 3 0 0 1 6 0" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
};
const LABELS: Record<string, string> = { index: "Table", menu: "Menu", belt: "The Belt", reserve: "Reserve", cart: "Order" };

function Bar({ state }: BottomTabBarProps) {
  const count = useStore((s) => cartCount(s.cart));
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(14, insets.bottom - 6) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((r, i) => {
          const on = state.index === i;
          const c = on ? color.palm : color.ink3;
          return (
            <Pressy key={r.key} feel="tick" onPress={() => router.navigate((r.name === "index" ? "/" : `/${r.name}`) as Href)} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <View>
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  {ICONS[r.name]?.(c)}
                  {on ? <Circle cx={12} cy={23} r={0} /> : null}
                </Svg>
                {r.name === "cart" && count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: on ? color.ink : color.ink3 }]}>{LABELS[r.name] ?? r.name}</Text>
            </Pressy>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayoutWeb() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <Bar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="menu" />
      <Tabs.Screen name="belt" />
      <Tabs.Screen name="reserve" />
      <Tabs.Screen name="cart" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bar: { flexDirection: "row", gap: 2, backgroundColor: "rgba(255,253,248,0.86)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(29,20,16,0.08)", shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  item: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 2, gap: 2 },
  label: { fontFamily: font.bodyBold, fontSize: 10.5 },
  badge: { position: "absolute", top: -4, right: -8, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: color.palm, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { fontFamily: font.bodyHeavy, fontSize: 10, color: color.white },
});
