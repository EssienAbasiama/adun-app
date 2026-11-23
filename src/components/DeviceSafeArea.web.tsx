import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

const ZERO = { frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } };

/**
 * In the browser Expo Router pins the safe-area insets to zero. This provider measures the
 * page's real env(safe-area-inset-*) values instead, so the web preview on a notched phone
 * keeps content clear of the status bar and home indicator, like the native app. It starts
 * at zero so the first render matches what the server sent.
 */
export function DeviceSafeArea({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={ZERO} style={{ flex: 1 }}>
      {children}
    </SafeAreaProvider>
  );
}
