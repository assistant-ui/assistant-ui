import type { ComponentProps } from "react";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { SymbolViewProps, SymbolWeight } from "expo-symbols";

export type IconName =
  | "compose"
  | "send"
  | "stop"
  | "add"
  | "remove"
  | "copy"
  | "check"
  | "reload"
  | "chevron-left"
  | "chevron-right"
  | "menu"
  | "location";

export type IconProps = {
  name: IconName;
  size?: number;
  color: string;
  weight?: SymbolWeight;
};

/** SF Symbols rendered natively on iOS via `expo-symbols`. */
export const SF_SYMBOLS: Record<IconName, SymbolViewProps["name"]> = {
  compose: "square.and.pencil",
  send: "arrow.up",
  stop: "stop.fill",
  add: "plus",
  remove: "xmark",
  copy: "doc.on.doc",
  check: "checkmark",
  reload: "arrow.clockwise",
  "chevron-left": "chevron.left",
  "chevron-right": "chevron.right",
  menu: "line.3.horizontal",
  location: "location.fill",
};

/** Material Icons fallback for Android and web. */
export const MATERIAL_ICONS: Record<
  IconName,
  ComponentProps<typeof MaterialIcons>["name"]
> = {
  compose: "edit",
  send: "arrow-upward",
  stop: "stop",
  add: "add",
  remove: "close",
  copy: "content-copy",
  check: "check",
  reload: "refresh",
  "chevron-left": "chevron-left",
  "chevron-right": "chevron-right",
  menu: "menu",
  location: "place",
};
