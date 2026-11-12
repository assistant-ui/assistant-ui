import { needKey, pendingNeeds } from "./needs";
import type { SetupNeed } from "./needs";
import { BROWSER_HEARTBEAT_MS, BROWSER_PRESENCE_MS } from "./protocol";
import type { Checkout } from "./protocol";

/** Within this long of opening a tab, setup never opens another. */
export const BROWSER_REOPEN_GUARD_MS = 30_000;
/** A page silent this long after it was present counts as closed; one heartbeat gap is not enough. */
export const BROWSER_CLOSE_GRACE_MS = BROWSER_HEARTBEAT_MS + 1_000;

/**
 * Why the agent should ask the user itself:
 * - recently-opened: a tab was opened moments ago, or opened and never joined;
 * - browser-closed: the user closed the setup tab (and it may not reopen yet);
 * - no-browser: setup may not open a browser (`--no-open`).
 */
export type AskReason = "recently-opened" | "browser-closed" | "no-browser";

export type BrowserGateAction =
  | { type: "open"; url: string; need: SetupNeed }
  | { type: "ask"; reason: AskReason; need: SetupNeed; openedAgoMs?: number };

/**
 * Decides when setup opens the user's browser: only once the setup waits on
 * the user, never while a joined tab is present, never twice within the
 * guard window, and again for a later need once a joined tab went away.
 * Presence is measured on this machine's clock from when each heartbeat
 * arrived, so a skewed server clock does not matter.
 */
export const createBrowserGate = ({
  url,
  canOpen = true,
  now = Date.now,
}: {
  /** The setup page for a state; `undefined` when there is none to open. */
  url: (state: Checkout.State) => string | undefined;
  /** False for `--no-open`: the agent is told to ask instead. */
  canOpen?: boolean;
  now?: () => number;
}) => {
  const handled = new Set<string>();
  /** Needs the agent was already told to ask about. */
  const told = new Set<string>();
  let openedAt: number | undefined;
  let joinedSinceOpen = false;
  let lastBeat: number | null | undefined;
  let beatArrivedAt: number | undefined;
  let present = false;
  let absentSince: number | undefined;
  let closedReported = true;
  let joinTimeoutReported = true;

  const trackPresence = (browser: Checkout.State["browser"]) => {
    if (browser === undefined) return;
    const time = now();
    if (browser.lastSeenAt !== lastBeat) {
      // Every beat, the first one included, counts from when it arrived here.
      beatArrivedAt = browser.lastSeenAt === null ? undefined : time;
      lastBeat = browser.lastSeenAt;
    }
    if (
      browser.connected &&
      beatArrivedAt !== undefined &&
      time - beatArrivedAt < BROWSER_PRESENCE_MS
    ) {
      present = joinedSinceOpen = true;
      absentSince = undefined;
      closedReported = false;
    } else if (present || absentSince !== undefined) {
      // A page that went quiet left when its last beat expired, not when this noticed.
      absentSince ??=
        browser.connected && beatArrivedAt !== undefined
          ? Math.min(time, beatArrivedAt + BROWSER_PRESENCE_MS)
          : time;
      present = false;
    }
  };

  return {
    update: (state: Checkout.State): BrowserGateAction[] => {
      trackPresence(state.browser);
      const time = now();
      const needs = pendingNeeds(state);
      const keys = new Set(needs.map(needKey));
      for (const key of handled) if (!keys.has(key)) handled.delete(key);
      for (const key of told) if (!keys.has(key)) told.delete(key);
      // Present, or gone too briefly to call it closed.
      const looksPresent =
        present ||
        (absentSince !== undefined &&
          time - absentSince < BROWSER_CLOSE_GRACE_MS);
      const closed = !looksPresent && absentSince !== undefined;
      const ask = (need: SetupNeed, reason: AskReason): BrowserGateAction => {
        told.add(needKey(need));
        return {
          type: "ask",
          reason,
          need,
          ...(reason === "recently-opened" && {
            openedAgoMs: time - openedAt!,
          }),
        };
      };
      const actions: BrowserGateAction[] = [];
      if (closed && !closedReported) {
        // The tab closed while the user had something to answer there.
        closedReported = true;
        for (const need of needs)
          if (handled.has(needKey(need)))
            actions.push(ask(need, "browser-closed"));
      }

      if (
        !joinTimeoutReported &&
        !joinedSinceOpen &&
        time - openedAt! >= BROWSER_REOPEN_GUARD_MS
      ) {
        // The opened tab never joined: it did not open, or the user left it.
        joinTimeoutReported = true;
        for (const need of needs)
          if (handled.has(needKey(need)) && !told.has(needKey(need)))
            actions.push(ask(need, "recently-opened"));
      }

      const fresh = needs.filter((need) => !handled.has(needKey(need)));
      for (const need of fresh) handled.add(needKey(need));
      if (fresh.length === 0 || looksPresent) return actions;
      const target = canOpen ? url(state) : undefined;
      if (target === undefined)
        return [...actions, ...fresh.map((need) => ask(need, "no-browser"))];
      if (
        openedAt === undefined ||
        (time - openedAt >= BROWSER_REOPEN_GUARD_MS && joinedSinceOpen)
      ) {
        openedAt = time;
        joinedSinceOpen = false;
        joinTimeoutReported = false;
        // One tab shows every waiting question.
        return [...actions, { type: "open", url: target, need: fresh[0]! }];
      }
      const reason =
        closed && joinedSinceOpen ? "browser-closed" : "recently-opened";
      return [...actions, ...fresh.map((need) => ask(need, reason))];
    },
  };
};
