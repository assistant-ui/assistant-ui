import type { Checkout } from "@/lib/checkout/protocol";

const STATUSES: readonly string[] = [
  "waiting",
  "planning",
  "installing",
  "done",
  "cancelled",
] satisfies readonly Checkout.Status[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNullable = (value: unknown, type: "number" | "string") =>
  value === null || typeof value === type;

/** A snapshot from the wire that this build cannot render. */
export class IncompatibleCheckoutError extends Error {
  constructor() {
    super("The setup session sent a state this page cannot read.");
    this.name = "IncompatibleCheckoutError";
  }
}

/** Accepts the wire snapshot only in the shape this build renders; the peer is unauthenticated. */
export const parseCheckoutState = (
  value: unknown,
): Checkout.State | undefined => {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    typeof value.status !== "string" ||
    !STATUSES.includes(value.status) ||
    !isNullable(value.createdAt, "number") ||
    typeof value.instructions !== "string" ||
    !isRecord(value.agent) ||
    !isNullable(value.agent.lastSeenAt, "number") ||
    typeof value.agent.connected !== "boolean" ||
    !isNullable(value.agent.cwd, "string") ||
    !isNullable(value.agent.kind, "string") ||
    !isNullable(value.agent.introducedAt, "number") ||
    ![value.products, value.plans, value.steps, value.inputs, value.log].every(
      (list) => Array.isArray(list) && list.every(isRecord),
    )
  ) {
    throw new IncompatibleCheckoutError();
  }
  return value as Checkout.State;
};
