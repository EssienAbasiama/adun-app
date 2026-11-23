/** Àdùn design tokens, mirrored from the website's globals.css so app and site feel like one brand. */
import { Easing } from "react-native-reanimated";

export const color = {
  paper: "#F5EEE3",
  paper2: "#ECE2D2",
  paper3: "#E0D2BD",
  ink: "#1D1410",
  ink2: "#4A3B32",
  ink3: "#85725F",
  palm: "#E2621B",
  palmDeep: "#B8460C",
  pepper: "#C3301E",
  plantain: "#F2B23A",
  leaf: "#2E5B3A",
  indigo: "#1F2A55",
  night: "#120D0A",
  night2: "#1E1612",
  night3: "#2C221C",
  white: "#FFFFFF",
} as const;

/** Font family names registered in the root layout via @expo-google-fonts. */
export const font = {
  display: "Fraunces_600SemiBold",
  displayRegular: "Fraunces_400Regular",
  displayItalic: "Fraunces_500Medium_Italic",
  body: "Manrope_500Medium",
  bodyBold: "Manrope_700Bold",
  bodyHeavy: "Manrope_800ExtraBold",
} as const;

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;

/** The site's two signature curves. */
export const ease = {
  silk: Easing.bezier(0.22, 1, 0.36, 1),
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;
