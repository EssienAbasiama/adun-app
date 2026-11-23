import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** how far it shrinks under the thumb */
  depth?: number;
  feel?: keyof typeof haptic | "none";
};

/** Every tappable thing in the app: a spring squash under the thumb plus a matching haptic. */
export function Pressy({ style, children, depth = 0.96, feel = "tap", onPressIn, onPressOut, onPress, ...rest }: Props) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => {
        s.value = withSpring(depth, { damping: 20, stiffness: 420 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 260 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feel !== "none") haptic[feel]();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
