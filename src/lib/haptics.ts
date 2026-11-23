/** Thin wrapper so every screen uses the same feel, and web (no haptics) never throws. */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const on = Platform.OS === "ios" || Platform.OS === "android";
const safe = (p: () => Promise<void>) => { if (on) p().catch(() => {}); };

export const haptic = {
  /** a dish clicking into place on the table, a chip changing */
  tick: () => safe(() => Haptics.selectionAsync()),
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  thud: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** the wax seal stamping */
  stamp: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
