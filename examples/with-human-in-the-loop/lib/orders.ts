import { z } from "zod";

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  /** Price of one unit, in cents. */
  unitPrice: number;
};

export type Order = {
  id: string;
  customer: string;
  placedOn: string;
  status: "processing" | "in transit" | "delivered";
  payment: { brand: string; last4: string };
  items: OrderItem[];
};

const ORDERS: Order[] = [
  {
    id: "1042",
    customer: "Maya Okafor",
    placedOn: "2026-11-02",
    status: "delivered",
    payment: { brand: "Visa", last4: "4242" },
    items: [
      { id: "hp-01", name: "Studio headphones", quantity: 1, unitPrice: 12900 },
      { id: "cb-02", name: "USB-C cable", quantity: 2, unitPrice: 1200 },
      { id: "dm-03", name: "Desk mat", quantity: 1, unitPrice: 3800 },
    ],
  },
  {
    id: "1057",
    customer: "Daniel Reyes",
    placedOn: "2026-11-09",
    status: "in transit",
    payment: { brand: "Mastercard", last4: "5100" },
    items: [
      { id: "kb-01", name: "Compact keyboard", quantity: 1, unitPrice: 8900 },
    ],
  },
  {
    id: "1063",
    customer: "Priya Nair",
    placedOn: "2026-11-12",
    status: "processing",
    payment: { brand: "Amex", last4: "0005" },
    items: [
      {
        id: "df-01",
        name: "Standing desk frame",
        quantity: 1,
        unitPrice: 42000,
      },
      { id: "ct-02", name: "Cable tray", quantity: 1, unitPrice: 3500 },
    ],
  },
];

/** Refunds above this total wait for a person. In cents. */
export const AUTO_REFUND_LIMIT = 10000;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatMoney = (cents: number) => money.format(cents / 100);

export const refundParameters = z.object({
  orderId: z.string().describe("The order number, digits only."),
  itemIds: z
    .array(z.string())
    .min(1)
    .describe("Ids of the items to refund, as returned by find_order."),
  reason: z
    .string()
    .describe("Why the customer is being refunded, in a few words."),
});

export type RefundRequest = z.infer<typeof refundParameters>;

export type Failure = { error: string };

export type FindOrderResult = Order | Failure;

export type RefundLine = { id: string; name: string; amount: number };

export type Refund = {
  refundId: string;
  orderId: string;
  /** In cents. */
  total: number;
  destination: string;
  lines: RefundLine[];
};

export type RefundResult = Refund | Failure;

export type RefundQuote =
  | (Pick<Refund, "total" | "destination" | "lines"> & { order: Order })
  | Failure;

export const isFailure = (result: unknown): result is Failure =>
  typeof result === "object" && result !== null && "error" in result;

export function findOrder(orderId: string): FindOrderResult {
  const order = ORDERS.find((candidate) => candidate.id === orderId.trim());
  return order ?? { error: `There is no order ${orderId}.` };
}

export const paymentLabel = (order: Order) =>
  `${order.payment.brand} ending ${order.payment.last4}`;

export const refundSummary = ({
  total,
  destination,
  lines,
}: Pick<Refund, "total" | "destination" | "lines">) =>
  `Refund ${formatMoney(total)} to ${destination} for ${lines
    .map((line) => line.name)
    .join(", ")}.`;

/** Prices a refund from the order on record, never from what the model sent. */
export function quoteRefund({
  orderId,
  itemIds,
}: Pick<RefundRequest, "orderId" | "itemIds">): RefundQuote {
  const order = findOrder(orderId);
  if (isFailure(order)) return order;

  const lines: RefundLine[] = [];
  for (const id of new Set(itemIds)) {
    const item = order.items.find((candidate) => candidate.id === id);
    if (!item) return { error: `Order ${order.id} has no item ${id}.` };
    lines.push({ id, name: item.name, amount: item.quantity * item.unitPrice });
  }

  return {
    order,
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    destination: paymentLabel(order),
  };
}

export function issueRefund(request: RefundRequest): RefundResult {
  const quote = quoteRefund(request);
  if (isFailure(quote)) return quote;

  const { order, ...refund } = quote;
  return {
    refundId: `re_${order.id}_${crypto.randomUUID().slice(0, 8)}`,
    orderId: order.id,
    ...refund,
  };
}
