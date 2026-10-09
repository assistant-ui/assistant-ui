import { NOTES_ENDPOINT } from "./notes";
import { buildSelection } from "./prompt";
import type { AgentStatus, Store } from "./store";

const HEADERS = { "x-variants": "1" };
export const AGENT_POLL_MS = 1500;

type AgentEvent = {
  id: string;
  re: string;
  type: "ack" | "status" | "done";
  text?: string;
  ok?: boolean;
  reload?: boolean;
};

const describeEvent = (event: AgentEvent) =>
  event.text ??
  (event.type === "ack"
    ? "Working on it"
    : event.type === "done"
      ? event.ok === false
        ? "Failed"
        : "Done"
      : "Working");

/**
 * Talks to a coding agent through the dev endpoint's mailbox: sends typed
 * `choose`/`apply` requests and polls the agent's events while active.
 */
export const createAgentLink = (
  store: Store,
  request: typeof fetch = (...args) => fetch(...args),
  reload: () => void = () => window.location.reload(),
) => {
  let after: string | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const pending = new Map<string, string[]>();

  const poll = async () => {
    try {
      const response = await request(
        `${NOTES_ENDPOINT}/agent${after ? `?after=${encodeURIComponent(after)}` : ""}`,
        { headers: HEADERS },
      );
      if (!response.ok) return;
      const body = (await response.json()) as {
        connected?: boolean;
        events?: AgentEvent[];
      };
      const status: Record<string, AgentStatus> = {
        ...store.getSnapshot().agent.status,
      };
      let shouldReload = false;
      for (const event of body.events ?? []) {
        after = event.id;
        const groups = pending.get(event.re);
        if (!groups) continue;
        for (const group of groups)
          status[group] = {
            type: event.type,
            text: describeEvent(event),
            ok: event.ok,
          };
        if (event.type === "done") {
          pending.delete(event.re);
          shouldReload ||= event.reload === true;
        }
      }
      store.setAgent({ connected: body.connected === true, status });
      if (shouldReload) reload();
    } catch {}
  };

  const setActive = (active: boolean) => {
    if (active && timer === undefined) {
      void poll();
      timer = setInterval(() => void poll(), AGENT_POLL_MS);
    } else if (!active && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  /** Sends the current selection (one group or the page) and the notes kept in this tab. */
  const send = async (
    kind: "choose" | "apply",
    only?: string,
  ): Promise<string | undefined> => {
    const selection = buildSelection(
      store.getSnapshot(),
      window.location,
      only,
    );
    const groups = selection.groups.map((group) => group.id);
    let response: Response;
    try {
      response = await request(`${NOTES_ENDPOINT}/agent/requests`, {
        method: "POST",
        headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          pairs: selection.groups.map(
            (group) => `${group.id}:${group.kept.id}`,
          ),
          notes: selection.notes,
          page: selection.url,
        }),
      });
    } catch {
      return "could not reach the dev server";
    }
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
    };
    if (!response.ok || !body.id)
      return body.error ?? `could not send (${response.status})`;
    pending.set(body.id, groups);
    const status = { ...store.getSnapshot().agent.status };
    for (const group of groups)
      status[group] = {
        type: "sent",
        text: "Sent to the agent",
        ok: undefined,
      };
    store.setAgent({ connected: true, status });
    return undefined;
  };

  return { poll, send, setActive };
};

export type AgentLink = ReturnType<typeof createAgentLink>;
