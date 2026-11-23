import { memo, useId } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { Opts } from "@/lib/menu";
import { Defs } from "./defs";
import { AfangArt, EgusiArt, JollofArt, SuyaArt, type DishProps } from "./dishes-naija";
import { AsadoArt, CarbonaraArt, PizzaArt, RamenArt } from "./dishes-world";
import { StageProvider, Svg } from "./svg";

const renderers: Record<string, (p: DishProps) => React.ReactNode> = {
  "party-jollof": JollofArt,
  tonkotsu: RamenArt,
  egusi: EgusiArt,
  carbonara: CarbonaraArt,
  suya: SuyaArt,
  margherita: PizzaArt,
  afang: AfangArt,
  asado: AsadoArt,
};

type Props = {
  slug: string;
  opts?: Opts;
  size: number;
  /** show only build stages up to this one (order tracker); omit for the finished plate */
  stage?: number | null;
  style?: StyleProp<ViewStyle>;
};

/** A signature plate, drawn in code. Memoised: the SVG is heavy, so it only re-renders when the dish or its options change. */
export const DishArt = memo(function DishArt({ slug, opts, size, stage = null, style }: Props) {
  const u = "d" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const Render = renderers[slug] ?? JollofArt;
  return (
    <Svg viewBox="0 0 400 400" width={size} height={size} style={style}>
      <Defs u={u} />
      <StageProvider stage={stage}>
        <Render u={u} o={opts} />
      </StageProvider>
    </Svg>
  );
});
