import { Fraunces_400Regular, Fraunces_500Medium_Italic, Fraunces_600SemiBold, useFonts } from "@expo-google-fonts/fraunces";
import { Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DeviceSafeArea } from "@/components/DeviceSafeArea";
import { Toaster } from "@/components/Toaster";
import { color } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.paper }}>
      <DeviceSafeArea>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="dish/[slug]" options={{ animation: "fade_from_bottom" }} />
          <Stack.Screen name="checkout" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="order" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack>
        <Toaster />
      </DeviceSafeArea>
    </GestureHandlerRootView>
  );
}
