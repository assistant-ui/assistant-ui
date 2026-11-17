"use generative";

import { defineToolkit, humanTool } from "@assistant-ui/react";
import { z } from "zod";
import { OrderCard } from "../components/order-card";
import { RefundApproval } from "../components/refund-approval";
import { ReturnItems } from "../components/return-items";
import { findOrder, issueRefund, refundParameters } from "../lib/orders";

export default defineToolkit({
  find_order: {
    description:
      "Look up an order by its number. Call it before saying anything about an order.",
    parameters: z.object({
      orderId: z.string().describe("The order number, digits only."),
    }),
    execute: async ({ orderId }) => findOrder(orderId),
    display: "standalone",
    render: OrderCard,
  },
  select_items: {
    description:
      "Ask which items of an order to refund when the request does not name them. Offer every item on the order with the id find_order returned. Ask the question in your message, not in the options.",
    parameters: z.object({
      orderId: z.string(),
      items: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          description: z.string().optional(),
        }),
      ),
    }),
    execute: humanTool(),
    render: ReturnItems,
  },
  issue_refund: {
    description:
      "Refund items of an order to its original payment method. The server prices the refund from the order on record.",
    parameters: refundParameters,
    execute: async (request) => issueRefund(request),
    display: "standalone",
    render: RefundApproval,
  },
});
