import { NativeTabs } from "expo-router/native-tabs";
import { cartCount, useStore } from "@/lib/store";
import { color, font } from "@/lib/theme";

/** The system tab bar: Liquid Glass on iOS 26, Material on Android. The cart count rides on the Order tab. */
export default function TabsLayout() {
  const count = useStore((s) => cartCount(s.cart));
  return (
    <NativeTabs
      tintColor={color.palm}
      labelStyle={{ default: { fontFamily: font.bodyBold, color: color.ink3 }, selected: { fontFamily: font.bodyBold, color: color.ink } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Table</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu">
        <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="menucard" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="belt">
        <NativeTabs.Trigger.Label>The Belt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fish" md="set_meal" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reserve">
        <NativeTabs.Trigger.Label>Reserve</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="envelope" md="mail" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>Order</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag" md="shopping_bag" />
        {count > 0 ? <NativeTabs.Trigger.Badge>{String(count)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
