import type { Checkout } from "@/lib/checkout/protocol";

type Shape = Record<string, (value: unknown) => boolean>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown) => typeof value === "string";
const num = (value: unknown) => typeof value === "number";
const bool = (value: unknown) => typeof value === "boolean";
const optional =
  (check: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    value === undefined || check(value);
const nullable =
  (check: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    value === null || check(value);
const oneOf =
  (...allowed: string[]) =>
  (value: unknown): boolean =>
    typeof value === "string" && allowed.includes(value);
const shaped =
  (shape: Shape) =>
  (value: unknown): boolean =>
    isRecord(value) &&
    Object.entries(shape).every(([key, check]) => check(value[key]));
const listOf =
  (check: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    Array.isArray(value) && value.every(check);

const status = oneOf(
  "waiting",
  "planning",
  "installing",
  "done",
  "cancelled",
) satisfies (value: unknown) => boolean;

const choiceOption = shaped({
  id: str,
  label: str,
  description: optional(str),
  icon: optional(str),
  variants: optional(listOf(shaped({ id: str, label: str }))),
});

const state = shaped({
  version: (value) => value === 2,
  status,
  createdAt: nullable(num),
  instructions: str,
  agent: shaped({
    lastSeenAt: nullable(num),
    connected: bool,
    cwd: nullable(str),
    kind: nullable(str),
    introducedAt: nullable(num),
  }),
  products: listOf(shaped({ slug: str, name: str, guide: optional(str) })),
  plans: listOf(
    shaped({
      revision: num,
      markdown: str,
      status: oneOf("proposed", "approved", "changes-requested"),
      submittedAt: num,
      decidedAt: optional(num),
      feedback: optional(str),
    }),
  ),
  steps: listOf(
    shaped({
      id: str,
      title: str,
      detail: optional(str),
      status: oneOf("pending", "active", "done", "skipped", "blocked"),
      note: optional(str),
      product: optional(str),
      createdAt: num,
    }),
  ),
  inputs: listOf(
    shaped({
      phase: status,
      id: str,
      kind: oneOf("text", "choice", "model"),
      preset: optional(str),
      prompt: str,
      placeholder: optional(str),
      options: optional(listOf(choiceOption)),
      default: optional(str),
      help: optional(shaped({ summary: str, href: optional(str) })),
      optional: bool,
      status: oneOf("open", "answered", "dismissed"),
      answer: optional(str),
      note: optional(str),
      stepId: optional(str),
      createdAt: num,
      answeredAt: optional(num),
    }),
  ),
  log: listOf(
    shaped({
      phase: status,
      id: str,
      role: oneOf("agent", "user"),
      acknowledgedAt: optional(num),
      at: num,
      text: str,
      stepId: optional(str),
    }),
  ),
});

/** A snapshot from the wire that this build cannot render. */
export class IncompatibleCheckoutError extends Error {
  constructor() {
    super("The setup session sent a state this page cannot read.");
    this.name = "IncompatibleCheckoutError";
  }
}

/** Accepts the wire snapshot only when every field the page renders has its type; the peer is unauthenticated. */
export const parseCheckoutState = (
  value: unknown,
): Checkout.State | undefined => {
  if (value === undefined) return undefined;
  if (!state(value)) throw new IncompatibleCheckoutError();
  return value as Checkout.State;
};
