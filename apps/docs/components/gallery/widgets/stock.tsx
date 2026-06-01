"use client";

import {
  Card,
  Row,
  Col,
  Title,
  Caption,
  Spacer,
  Badge,
  Chart,
} from "../json-ui/primitives";
import type { ToolRenderProps } from "./types";

export type StockArgs = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  series: number[];
};

export function StockToolUI({ args }: ToolRenderProps<StockArgs>) {
  const {
    symbol,
    name,
    price,
    change,
    changePercent,
    currency = "USD",
    series,
  } = args;
  const up = change >= 0;
  const sign = up ? "+" : "";
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency });

  return (
    <Card>
      <Col gap={3}>
        <Row align="center" gap={2}>
          <Col gap={0}>
            <Title value={symbol} size="md" />
            <Caption value={name} />
          </Col>
          <Spacer />
          <Badge>{`${sign}${changePercent.toFixed(2)}%`}</Badge>
        </Row>
        <Title size="2xl">{fmt.format(price)}</Title>
        <Chart
          variant="sparkline"
          color={up ? "var(--chart-2)" : "var(--chart-5)"}
          data={series.map((value) => ({ value }))}
        />
      </Col>
    </Card>
  );
}

const SAMPLE: StockArgs = {
  symbol: "ACME",
  name: "Acme Corp.",
  price: 184.32,
  change: 4.18,
  changePercent: 2.32,
  currency: "USD",
  series: [171, 169, 173, 175, 174, 178, 176, 181, 180, 184],
};

export function StockPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <StockToolUI args={SAMPLE} />
    </div>
  );
}
