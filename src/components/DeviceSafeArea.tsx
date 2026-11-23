import type { ReactNode } from "react";

/** On iOS and Android, Expo Router already provides the device's safe-area insets. */
export function DeviceSafeArea({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
