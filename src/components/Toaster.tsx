import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeOutUp, LinearTransition, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";
import { Pressy } from "./Pressy";
import { Thumb } from "./Thumb";

/** "Added to your order" cards that drop in from the top and stack. */
export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      {toasts.map((t) => (
        <Animated.View key={t.id} entering={SlideInUp.springify().damping(18)} exiting={FadeOutUp.duration(220)} layout={LinearTransition.springify()}>
          <Pressy feel="none" onPress={() => dismiss(t.id)} style={styles.toast} accessibilityRole="alert">
            {t.thumb ? <Thumb thumb={t.thumb} size={40} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {t.title}
              </Text>
              {t.body ? (
                <Text style={styles.body} numberOfLines={1}>
                  {t.body}
                </Text>
              ) : null}
            </View>
          </Pressy>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, gap: 8, zIndex: 1000 },
  toast: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.ink, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 12, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  title: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
  body: { fontFamily: font.body, fontSize: 12.5, color: color.paper3, marginTop: 1 },
});
