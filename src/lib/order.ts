import { useCallback } from "react";
import { money } from "./format";
import { haptic } from "./haptics";
import { img, type ImgKey } from "./images";
import { defaultOpts, describeOpts, priceFor, tiers, type BeltItem, type MenuItem, type Opts, type Signature } from "./menu";
import { useStore } from "./store";

const keyOf = (id: string, o?: Opts) =>
  id +
  (o
    ? "|" +
      Object.keys(o)
        .sort()
        .map((k) => `${k}=${Array.isArray(o[k]) ? [...(o[k] as string[])].sort().join("+") : o[k]}`)
        .join("&")
    : "");

/** Menu items hold an image source; the cart stores the photo's key so it survives app updates. */
const imageKey = new Map<unknown, ImgKey>(Object.entries(img).map(([k, v]) => [v, k as ImgKey]));
export const keyForImage = (src: unknown): ImgKey => imageKey.get(src) ?? "naijaSpread";

export function useOrder() {
  const add = useStore((s) => s.add);
  const toast = useStore((s) => s.toast);
  const stackPlate = useStore((s) => s.stackPlate);

  const addSignature = useCallback(
    (sig: Signature, opts: Opts = defaultOpts(sig), qty = 1) => {
      const unit = priceFor(sig, opts);
      const meta = describeOpts(sig, opts);
      add({ key: keyOf(sig.slug, opts), id: sig.slug, name: sig.name, unit, qty, thumb: { kind: "art", slug: sig.slug, opts }, meta });
      haptic.success();
      toast({ title: `${qty > 1 ? `${qty} × ` : ""}${sig.name} added`, body: `${money(unit * qty)} · ${meta || "House style"}`, thumb: { kind: "art", slug: sig.slug, opts } });
    },
    [add, toast],
  );

  const addItem = useCallback(
    (item: MenuItem, qty = 1) => {
      const key = keyForImage(item.image);
      add({ key: item.id, id: item.id, name: item.name, unit: item.price, qty, thumb: { kind: "img", key } });
      haptic.success();
      toast({ title: `${item.name} added`, body: money(item.price), thumb: { kind: "img", key } });
    },
    [add, toast],
  );

  const addBelt = useCallback(
    (item: BeltItem) => {
      const t = tiers[item.tier];
      add({ key: `belt-${item.id}`, id: item.id, name: item.name, unit: t.price, qty: 1, thumb: { kind: "belt", item: item.id }, meta: `${t.label} plate · from The Belt` });
      stackPlate(item.tier);
      haptic.thud();
      toast({ title: `${item.name} off the belt`, body: `${t.label} plate · ${money(t.price)}`, thumb: { kind: "belt", item: item.id } });
    },
    [add, toast, stackPlate],
  );

  return { addSignature, addItem, addBelt };
}
