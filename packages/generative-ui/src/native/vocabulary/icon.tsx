import { Text } from "react-native";
import type { IconName } from "../../ir";
import type { GenerativeUILibrary } from "../../types";
import { iconDefinitions } from "../../vocabulary/definitions/icon";
import { iconSize } from "../../vocabulary/iconGlyphs";
import { useInk } from "../theme";

/** A monochrome character per icon that system fonts on iOS and Android draw as text, with U+FE0E where a character would otherwise show as a color emoji. */
const ICON_CHARACTERS: Record<IconName, string> = {
  sun: "☀\uFE0E",
  moon: "☾",
  cloud: "☁\uFE0E",
  rain: "☂\uFE0E",
  snow: "❄\uFE0E",
  wind: "≋",
  play: "▶\uFE0E",
  pause: "⏸\uFE0E",
  check: "✓",
  x: "✕",
  star: "★",
  heart: "♥\uFE0E",
  "arrow-right": "→",
  "arrow-up-right": "↗\uFE0E",
  "chevron-right": "›",
  calendar: "▦",
  clock: "◷",
  "map-pin": "\u{1F4CD}\uFE0E",
  plane: "✈\uFE0E",
  truck: "⛟",
  "credit-card": "▭",
  user: "☺\uFE0E",
  search: "⌕",
  bell: "\u{1F514}\uFE0E",
};

function Icon({ name, size }: { name?: unknown; size?: unknown }) {
  const ink = useInk();
  if (typeof name !== "string" || !Object.hasOwn(ICON_CHARACTERS, name))
    return null;
  const px = iconSize(size);
  return (
    <Text
      aria-hidden
      style={{
        fontSize: px,
        lineHeight: px,
        width: px,
        textAlign: "center",
        color: ink,
      }}
    >
      {ICON_CHARACTERS[name as IconName]}
    </Text>
  );
}

export const iconVocabulary = {
  Icon: {
    ...iconDefinitions.Icon,
    render: ({ name, size }) => <Icon name={name} size={size} />,
  },
} satisfies GenerativeUILibrary;
