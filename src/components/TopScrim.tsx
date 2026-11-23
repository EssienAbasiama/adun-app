import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Fades scrolled content out under the status bar, so text never runs into the clock. */
export function TopScrim({ color, fade = 18 }: { color: string; fade?: number }) {
  const { top } = useSafeAreaInsets();
  if (!top) return null;
  const h = top + fade;
  return <LinearGradient colors={[color, color, `${color}00`]} locations={[0, top / h, 1]} style={[styles.scrim, { height: h }]} />;
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", left: 0, right: 0, top: 0, pointerEvents: "none" },
});
