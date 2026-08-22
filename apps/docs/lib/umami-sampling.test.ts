import { expect, it } from "vitest";
import { UMAMI_SAMPLE_RATE, umamiBootstrapScript } from "./umami-sampling";

const MONTH_START = Date.UTC(2026, 7, 1);
const NEXT_MONTH = Date.UTC(2026, 8, 1);

type Appended = { src: string; async: boolean; attrs: Record<string, string> };

type RunOptions = {
  store?: Map<string, string>;
  rolls?: number[];
  now?: number;
  storageThrows?: boolean;
};

const run = ({
  store = new Map<string, string>(),
  rolls = [UMAMI_SAMPLE_RATE / 2],
  now = MONTH_START,
  storageThrows = false,
}: RunOptions = {}) => {
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
    createElement: () => ({
      src: "",
      async: true,
      attrs: {} as Record<string, string>,
      setAttribute(key: string, value: string) {
        this.attrs[key] = value;
      },
    }),
    head: {
      appendChild: (element: Appended) => {
        appended.push(element);
      },
    },
  };

  // Math's own properties are non-enumerable, so spreading it yields {}
  const fakeMath = Object.assign(Object.create(Math) as Math, {
    random: () => rolls[Math.min(rollsUsed++, rolls.length - 1)]!,
  });

  class FakeDate extends Date {
    static override now() {
      return now;
    }
  }

  const fn = new Function(
    "window",
    "document",
    "Date",
    "Math",
    umamiBootstrapScript,
  );
  fn({ localStorage }, document, FakeDate, fakeMath);

  return { appended, store, rollsUsed };
};

it("loads the tracker when the roll lands under the rate", () => {
  const { appended } = run({ rolls: [UMAMI_SAMPLE_RATE / 2] });

  expect(appended).toHaveLength(1);
  expect(appended[0]!.src).toBe("/umami/script.js");
  expect(appended[0]!.async).toBe(false);
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

it("outlasts a visit whichever boundary umami applies to it", () => {
  const store = new Map<string, string>();

  run({
    store,
    rolls: [UMAMI_SAMPLE_RATE / 2],
    now: MONTH_START + 55 * 60_000,
  });
  // past the clock hour and past 1800s from the first pageview: neither of
  // umami's two visit conditions may move the decision
  const acrossTheHour = run({
    store,
    rolls: [1],
    now: MONTH_START + 70 * 60_000,
  });

  expect(acrossTheHour.rollsUsed).toBe(0);
  expect(acrossTheHour.appended).toHaveLength(1);
});

it("rolls again in the next month, where umami rotates its salt", () => {
  const store = new Map<string, string>();

  run({ store, rolls: [UMAMI_SAMPLE_RATE / 2], now: MONTH_START });
  const nextBucket = run({ store, rolls: [1], now: NEXT_MONTH });

  expect(nextBucket.rollsUsed).toBe(1);
  expect(nextBucket.appended).toHaveLength(0);
});

it("reuses a stored decision to stay out of the sample", () => {
  const store = new Map<string, string>();

  run({ store, rolls: [1] });
  const secondTab = run({ store, rolls: [UMAMI_SAMPLE_RATE / 2] });

  expect(secondTab.rollsUsed).toBe(0);
  expect(secondTab.appended).toHaveLength(0);
});

it("rolls fresh when the stored payload is unreadable", () => {
  const store = new Map<string, string>([["aui-umami-sample", "not-json"]]);

  const { appended, rollsUsed } = run({
    store,
    rolls: [UMAMI_SAMPLE_RATE / 2],
  });

  expect(rollsUsed).toBe(1);
  expect(appended).toHaveLength(1);
});

it("does not track at all when storage is unavailable", () => {
  // rolling per load there would be event sampling, and umami turns each
  // surviving pageview into its own visit
  const first = run({ rolls: [UMAMI_SAMPLE_RATE / 2], storageThrows: true });
  const second = run({ rolls: [UMAMI_SAMPLE_RATE / 2], storageThrows: true });

  expect(first.appended).toHaveLength(0);
  expect(second.appended).toHaveLength(0);
});
