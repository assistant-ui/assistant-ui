import {
  formatMoney,
  isFailure,
  paymentLabel,
  type FindOrderResult,
  type Order,
  type RefundResult,
} from "./orders";

export type ScriptEvent =
  | { type: "user"; text: string }
  | {
      type: "tool";
      toolName: string;
      input: unknown;
      output: unknown;
      denied?: boolean;
    };

export type ScriptStep = {
  text?: string;
  call?: {
    toolName: "find_order" | "select_items" | "issue_refund";
    input: Record<string, unknown>;
  };
};

type ToolEvent = Extract<ScriptEvent, { type: "tool" }>;

const ORDER_ID = /\b(\d{4})\b/;
const WANTS_REFUND = /refund|return|send\b.*\bback|money back/i;
const DAMAGED = /damaged|broken|cracked|bent|faulty|defective/i;
const NOT_DELIVERED = /never (arrived|shipped|came)|missing|lost/i;

const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;

const refundReason = (request: string) => {
  if (DAMAGED.test(request)) return "Arrived damaged";
  if (NOT_DELIVERED.test(request)) return "Never arrived";
  return "Customer asked for a refund";
};

const namedItems = (request: string, order: Order) =>
  order.items.filter((item) => {
    const noun = item.name.split(" ").at(-1)!;
    return new RegExp(`\\b${noun}\\b`, "i").test(request);
  });

const lastOrderId = (events: ScriptEvent[]) => {
  for (const event of events.toReversed()) {
    const id =
      event.type === "user"
        ? ORDER_ID.exec(event.text)?.[1]
        : field(event.input, "orderId");
    if (typeof id === "string") return id;
  }
  return undefined;
};

const describeOrder = (order: Order) =>
  `Order ${order.id} for ${order.customer} is ${order.status}. It has ${order.items.length} ${
    order.items.length === 1 ? "item" : "items"
  }, paid with ${paymentLabel(order)}.`;

function afterLookup(request: string, order: Order): ScriptStep {
  if (!WANTS_REFUND.test(request)) return { text: describeOrder(order) };

  const named = namedItems(request, order);
  const items = order.items.length === 1 ? order.items : named;
  if (items.length > 0) {
    return {
      call: {
        toolName: "issue_refund",
        input: {
          orderId: order.id,
          itemIds: items.map((item) => item.id),
          reason: refundReason(request),
        },
      },
    };
  }

  return {
    text: "Which items are coming back?",
    call: {
      toolName: "select_items",
      input: {
        orderId: order.id,
        items: order.items.map((item) => ({
          id: item.id,
          label: item.name,
          description: `${item.quantity} × ${formatMoney(item.unitPrice)}`,
        })),
      },
    },
  };
}

function afterTool(request: string, event: ToolEvent): ScriptStep {
  switch (event.toolName) {
    case "find_order": {
      const order = event.output as FindOrderResult;
      if (isFailure(order)) {
        return { text: `${order.error} Check the number and send it again.` };
      }
      return afterLookup(request, order);
    }
    case "select_items": {
      const selected = field(event.output, "selected");
      if (!Array.isArray(selected) || selected.length === 0) {
        return { text: "Nothing was selected, so nothing was refunded." };
      }
      return {
        call: {
          toolName: "issue_refund",
          input: {
            orderId: field(event.input, "orderId"),
            itemIds: selected,
            reason: refundReason(request),
          },
        },
      };
    }
    case "issue_refund": {
      if (event.denied) {
        return {
          text: `Understood. Order ${String(field(event.input, "orderId"))} has not been refunded. Tell me what to do instead.`,
        };
      }
      const refund = event.output as RefundResult;
      if (isFailure(refund)) return { text: refund.error };
      return {
        text: `Refunded ${formatMoney(refund.total)} to ${refund.destination}. The reference is ${refund.refundId}.`,
      };
    }
    default:
      return { text: "That is outside what this scripted demo covers." };
  }
}

/**
 * Stands in for a model when no API key is configured: given what has happened
 * in the conversation, it returns the next thing an agent would say or call.
 */
export function nextStep(history: ScriptEvent[]): ScriptStep {
  const turnStart = history.findLastIndex((event) => event.type === "user");
  const request = history[turnStart];
  if (request?.type !== "user") {
    return { text: "Give me an order number and what the customer needs." };
  }

  const lastTool = history.at(-1);
  if (lastTool?.type === "tool") return afterTool(request.text, lastTool);

  const orderId =
    ORDER_ID.exec(request.text)?.[1] ??
    lastOrderId(history.slice(0, turnStart));
  if (!orderId) {
    return { text: "Which order is this about? Send me the order number." };
  }
  return { call: { toolName: "find_order", input: { orderId } } };
}
