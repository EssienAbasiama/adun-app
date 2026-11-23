import { Image } from "expo-image";
import { memo } from "react";
import { View } from "react-native";
import { BeltPlate } from "@/art/BeltArt";
import { DishArt } from "@/art/DishArt";
import { img } from "@/lib/images";
import { beltItems } from "@/lib/menu";
import type { Thumb as ThumbT } from "@/lib/store";
import { color } from "@/lib/theme";

/** The little picture beside a cart line or toast: a drawn signature, a photo, or a belt plate. */
export const Thumb = memo(function Thumb({ thumb, size = 48 }: { thumb: ThumbT; size?: number }) {
  if (thumb.kind === "art") return <DishArt slug={thumb.slug} opts={thumb.opts} size={size} />;
  if (thumb.kind === "belt") {
    const item = beltItems.find((b) => b.id === thumb.item);
    return item ? <BeltPlate item={item} size={size} /> : <View style={{ width: size, height: size }} />;
  }
  return <Image source={img[thumb.key]} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.paper2 }} contentFit="cover" transition={150} />;
});
