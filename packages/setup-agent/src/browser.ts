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
 * - recently-opened: a tab was opened moments ago (or opened and never joined), so another would pile up;
 * - browser-closed: the user closed the setup tab while this was waiting;
 * - no-browser: setup may not open a browser (`--no-open`).
 */
export type AskReason = "recently-opened" | "browser-closed" | "no-browser";

export type BrowserGateAction =
  | { type: "open"; url: string; need: SetupNeed }
  | {
      type: "ask";
      reason: AskReason;
      need: SetupNeed;
      /** How long ago setup last opened a tab, for recently-opened. */
      openedAgoMs?: number;
    };

export type BrowserGateOptions = {
  /** The setup page for the current state; `undefined` when there is none to open. */
  url: (state: Checkout.State) => string | undefined;
  /** False for `--no-open`: setup tells the agent to ask instead of opening. */
  canOpen?: boolean;
  now?: () => number;
  guardMs?: number;
};

export type BrowserGate = {
  /** Feed every state (and a periodic tick with the last one); returns what to do now. */
  update: (state: Checkout.State) => BrowserGateAction[];
  /** When setup last opened a tab, if it did. */
  readonly openedAt: number | undefined;
};

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
  guardMs = BROWSER_REOPEN_GUARD_MS,
}: BrowserGateOptions): BrowserGate => {
  const handled = new Set<string>();
  let openedAt: number | undefined;
  /** A page joined since setup last opened one (or before setup opened any). */
  let joinedSinceOpen = false;
  let lastBeat: number | null | undefined;
  let beatArrivedAt: number | undefined;
  let present = false;
  let absentSince: number | undefined;
  let closedReported = true;

  const trackPresence = (state: Checkout.State) => {
    const time = now();
    const browser = state.browser;
    if (browser === undefined) return;
    if (browser.lastSeenAt !== lastBeat) {
      // The first state carries an old beat; judge it by the server's clock once.
      beatArrivedAt =
        lastBeat === undefined && browser.lastSeenAt !== null
          ? Math.min(time, browser.lastSeenAt)
          : browser.lastSeenAt === null
            ? undefined
            : time;
      lastBeat = browser.lastSeenAt;
    }
    const isPresent =
      browser.connected &&
      beatArrivedAt !== undefined &&
      time - beatArrivedAt < BROWSER_PRESENCE_MS;
    if (isPresent) {
      present = true;
      joinedSinceOpen = true;
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

  /** Present, or gone too briefly to call it closed. */
  const looksPresent = () =>
    present ||
    (absentSince !== undefined && now() - absentSince < BROWSER_CLOSE_GRACE_MS);

  return {
    get openedAt() {
      return openedAt;
    },
    update: (state) => {
      trackPresence(state);
      const needs = pendingNeeds(state);
      const pending = new Set(needs.map(needKey));
      for (const key of handled) if (!pending.has(key)) handled.delete(key);
      const actions: BrowserGateAction[] = [];

      // The tab closed while the user had something to answer there.
      if (!looksPresent() && absentSince !== undefined && !closedReported) {
        closedReported = true;
        for (const need of needs) {
          if (!handled.has(needKey(need))) continue;
          actions.push({ type: "ask", reason: "browser-closed", need });
        }
      }

      const fresh = needs.filter((need) => !handled.has(needKey(need)));
      for (const need of fresh) handled.add(needKey(need));
      if (fresh.length === 0 || looksPresent()) return actions;

      const target = canOpen ? url(state) : undefined;
      if (target === undefined) {
        for (const need of fresh)
          actions.push({ type: "ask", reason: "no-browser", need });
        return actions;
      }
      const time = now();
      const mayOpen =
        openedAt === undefined ||
        (time - openedAt >= guardMs && joinedSinceOpen);
      if (mayOpen) {
        openedAt = time;
        joinedSinceOpen = false;
        // One tab shows every waiting question.
        actions.push({ type: "open", url: target, need: fresh[0]! });
        return actions;
      }
      for (const need of fresh)
        actions.push({
          type: "ask",
          reason: "recently-opened",
          need,
          openedAgoMs: time - openedAt!,
        });
      return actions;
    },
  };
};
