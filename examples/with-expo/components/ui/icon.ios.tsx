import { SymbolView } from "expo-symbols";
import { SF_SYMBOLS, type IconProps } from "./icon-mappings";

export function Icon({
  name,
  size = 24,
  color,
  weight = "regular",
}: IconProps) {
  return (
    <SymbolView
      name={SF_SYMBOLS[name]}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
