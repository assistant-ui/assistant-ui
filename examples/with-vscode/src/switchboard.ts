export const SWITCHBOARD = {
  csp: {
    values: ["strict", "relaxed"],
  },
  location: {
    values: ["sidebar", "panel", "editor"],
  },
} as const;

export type SwitchboardKey = keyof typeof SWITCHBOARD;

export type Switchboard = {
  [K in SwitchboardKey]: (typeof SWITCHBOARD)[K]["values"][number];
};

export const SWITCHBOARD_KEYS = Object.keys(SWITCHBOARD) as SwitchboardKey[];
