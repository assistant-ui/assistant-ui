export const SWITCHBOARD = {
  runtime: {
    values: ["ai-sdk", "data-stream", "assistant-transport"],
    implemented: ["ai-sdk"],
  },
  backend: {
    values: ["fixture", "anthropic", "vscode-lm"],
    implemented: ["fixture"],
  },
  style: {
    values: ["shadcn", "vscode"],
    implemented: ["shadcn"],
  },
  csp: {
    values: ["strict", "relaxed"],
    implemented: ["strict", "relaxed"],
  },
  location: {
    values: ["sidebar", "panel", "editor"],
    implemented: ["sidebar", "panel", "editor"],
  },
} as const;

export type SwitchboardKey = keyof typeof SWITCHBOARD;

export type Switchboard = {
  [K in SwitchboardKey]: (typeof SWITCHBOARD)[K]["values"][number];
};

export const SWITCHBOARD_KEYS = Object.keys(SWITCHBOARD) as SwitchboardKey[];

export const isImplemented = (key: SwitchboardKey, value: string) =>
  (SWITCHBOARD[key].implemented as readonly string[]).includes(value);

export const unimplementedSettings = (switchboard: Switchboard) =>
  SWITCHBOARD_KEYS.filter((key) => !isImplemented(key, switchboard[key])).map(
    (key) => ({ key, value: switchboard[key] }),
  );
