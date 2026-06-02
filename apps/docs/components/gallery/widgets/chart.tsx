"use client";

import { Card, Col, Title, Caption, Chart } from "@/components/generative-ui";
import type { ToolRenderProps } from "./types";

export type ChartArgs = {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
};

export function ChartToolUI({ args }: ToolRenderProps<ChartArgs>) {
  const { title, subtitle, data } = args;
  return (
    <Card>
      <Col gap={2}>
        <Title value={title} size="md" />
        {subtitle ? <Caption value={subtitle} /> : null}
        <Chart variant="bar" data={data} />
      </Col>
    </Card>
  );
}

const SAMPLE: ChartArgs = {
  title: "Active users",
  subtitle: "Monthly signups, last 6 months",
  data: [
    { label: "Jan", value: 320 },
    { label: "Feb", value: 412 },
    { label: "Mar", value: 386 },
    { label: "Apr", value: 503 },
    { label: "May", value: 478 },
    { label: "Jun", value: 564 },
  ],
};

export function ChartPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <ChartToolUI args={SAMPLE} />
    </div>
  );
}
