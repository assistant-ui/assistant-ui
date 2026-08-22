import { expect, it } from "vitest";
import { UMAMI_SAMPLE_RATE, umamiBootstrapScript } from "./umami-sampling";

type Appended = { src: string; defer: boolean; attrs: Record<string, string> };

type RunOptions = {
  store?: Map<string, string>;
  rolls?: number[];
  now?: number;
  storageThrows?: boolean;
};

type RunResult = {
  appended: Appended[];
  store: Map<string, string>;
  rollsUsed: number;
};

const run = ({
  store = new Map<string, string>(),
  rolls = [UMAMI_SAMPLE_RATE / 2],
  now = 1_000_000,
  storageThrows = false,
}: RunOptions = {}): RunResult => {
  const appended: Appended[] = [];
  let rollsUsed = 0;

  const localStorage = storageThrows
    ? {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      }
    : {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      };

  const document = {
    createElement: (): Appended & {
      setAttribute: (k: string, v: string) => void;
    } => {
      const element = {
        src: "",
        defer: false,
        attrs: {} as Record<string, string>,
        setAttribute(key: string, value: string) {
          this.attrs[key] = value;
        },
      };
      return element;
    },
    head: {
      appendChild: (element: Appended) => {
        appended.push(element);
      },
    },
  };

  const fakeMath = {
    ...Math,
    random: () => rolls[Math.min(rollsUsed++, rolls.length - 1)]!,
  };

  const fn = new Function(
    "window",
    "document",
    "Date",
    "Math",
    umamiBootstrapScript,
  );
  fn({ localStorage }, document, { now: () => now }, fakeMath);

  return { appended, store, rollsUsed };
};

it("loads the tracker when the roll lands under the rate", () => {
  const { appended } = run({ rolls: [UMAMI_SAMPLE_RATE / 2] });

  expect(appended).toHaveLength(1);
  expect(appended[0]!.src).toBe("/umami/script.js");
  expect(appended[0]!.defer).toBe(true);
  expect(appended[0]!.attrs["data-website-id"]).toBe(
    "6f07c001-46a2-411f-9241-4f7f5afb60ee",
  );
  expect(appended[0]!.attrs["data-domains"]).toBe("www.assistant-ui.com");
});

it("stays out of the sample when the roll lands on the rate", () => {
  const { appended } = run({ rolls: [UMAMI_SAMPLE_RATE] });

  expect(appended).toHaveLength(0);
});

it("gives every tab in the visit the same answer", () => {
  const store = new Map<string, string>();

  const first = run({ store, rolls: [UMAMI_SAMPLE_RATE / 2] });
  // a second tab would lose its own roll, but must follow the stored decision
  const second = run({ store, rolls: [1] });

  expect(first.appended).toHaveLength(1);
  expect(second.appended).toHaveLength(1);
  expect(second.rollsUsed).toBe(0);
});

it("rolls again once the visit window has lapsed", () => {
  const store = new Map<string, string>();

  run({ store, rolls: [UMAMI_SAMPLE_RATE / 2], now: 1_000_000 });
  const later = run({ store, rolls: [1], now: 1_000_000 + 30 * 60 * 1000 + 1 });

  expect(later.rollsUsed).toBe(1);
  expect(later.appended).toHaveLength(0);
});

it("extends the window while the reader keeps browsing", () => {
  const store = new Map<string, string>();

  run({ store, rolls: [UMAMI_SAMPLE_RATE / 2], now: 1_000_000 });
  const midVisit = run({ store, rolls: [1], now: 1_000_000 + 20 * 60 * 1000 });
  const afterOriginalExpiry = run({
    store,
    rolls: [1],
    now: 1_000_000 + 45 * 60 * 1000,
  });

  expect(midVisit.appended).toHaveLength(1);
  expect(afterOriginalExpiry.rollsUsed).toBe(0);
  expect(afterOriginalExpiry.appended).toHaveLength(1);
});

it("still decides when storage is unavailable", () => {
  const { appended } = run({
    rolls: [UMAMI_SAMPLE_RATE / 2],
    storageThrows: true,
  });

  expect(appended).toHaveLength(1);
});
