"use client";

import {
  Card,
  Row,
  Col,
  Text,
  Caption,
  Spacer,
  Divider,
  Button,
} from "../json-ui/primitives";
import type { ToolRenderProps } from "./types";

export type OrderItem = {
  name: string;
  detail?: string;
  quantity?: number;
  price: number;
};
export type OrderArgs = {
  merchant: string;
  items: OrderItem[];
  currency?: string;
  taxRate?: number;
};

export function OrderToolUI({ args }: ToolRenderProps<OrderArgs>) {
  const { merchant, items, currency = "USD", taxRate = 0 } = args;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * (item.quantity ?? 1),
    0,
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <Card>
      <Col gap={3}>
        <Caption>{merchant}</Caption>

        {items.map((item, index) => (
          <Row key={index} align="center" gap={3}>
            <Col gap={0}>
              <Text size="sm" weight="medium">
                {item.name}
                {item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </Text>
              {item.detail ? <Caption>{item.detail}</Caption> : null}
            </Col>
            <Spacer />
            <Text size="sm">{fmt(item.price * (item.quantity ?? 1))}</Text>
          </Row>
        ))}

        <Divider />

        <SummaryRow label="Subtotal" value={fmt(subtotal)} />
        {taxRate ? (
          <SummaryRow
            label={`Tax (${(taxRate * 100).toFixed(2)}%)`}
            value={fmt(tax)}
          />
        ) : null}
        <SummaryRow label="Total" value={fmt(total)} bold />

        <Button label="Place order" block />
      </Col>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Row align="center">
      <Text
        size="sm"
        color={bold ? "emphasis" : "secondary"}
        weight={bold ? "medium" : "normal"}
      >
        {label}
      </Text>
      <Spacer />
      <Text size="sm" weight={bold ? "medium" : "normal"}>
        {value}
      </Text>
    </Row>
  );
}

const SAMPLE: OrderArgs = {
  merchant: "Hoick Coffee",
  currency: "USD",
  taxRate: 0.0875,
  items: [
    { name: "Black Sugar Latte", detail: "16oz Iced · Boba", price: 6.5 },
    {
      name: "Classic Milk Tea",
      detail: "16oz Iced · Double Boba",
      price: 6.75,
    },
    { name: "Matcha Latte", detail: "16oz Iced · Boba", price: 6.5 },
  ],
};

export function OrderPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <OrderToolUI args={SAMPLE} />
    </div>
  );
}
