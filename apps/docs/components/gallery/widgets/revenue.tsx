"use client";

import {
  Card,
  Col,
  Row,
  Title,
  Caption,
  Badge,
  Chart,
} from "@/components/generative-ui";
import type { ToolRenderProps } from "./types";

export type RevenueArgs = {
  label: string;
  value: string;
  change: string;
  caption?: string;
  data: { label: string; value: number }[];
};

export function RevenueToolUI({ args }: ToolRenderProps<RevenueArgs>) {
  const { label, value, change, caption, data } = args;
  return (
    <Card>
      <Col gap={2}>
        <Caption>{label}</Caption>
        <Title value={value} size="2xl" />
        <Row align="center" gap={1}>
          <Badge>{change}</Badge>
          {caption ? <Caption>{caption}</Caption> : null}
        </Row>
        <Chart variant="line" color="var(--chart-2)" data={data} />
      </Col>
    </Card>
  );
}

const SAMPLE: RevenueArgs = {
  label: "Revenue",
  value: "$48,250",
  change: "+12.4%",
  caption: "vs last month",
  data: [
    { label: "Wk 1", value: 9200 },
    { label: "Wk 2", value: 10400 },
    { label: "Wk 3", value: 9800 },
    { label: "Wk 4", value: 12600 },
    { label: "Wk 5", value: 12100 },
    { label: "Wk 6", value: 14200 },
  ],
};

export function RevenuePreview() {
  return (
    <div className="w-full max-w-[340px]">
      <RevenueToolUI args={SAMPLE} />
    </div>
  );
}
