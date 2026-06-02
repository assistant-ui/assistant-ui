"use client";

import { useState } from "react";
import {
  Card,
  Row,
  Col,
  Text,
  Caption,
  Icon,
  Button,
} from "@/components/generative-ui";
import type { ToolRenderProps } from "./types";

export type EventArgs = {
  title: string;
  date: string;
  time: string;
  location?: string;
};
export type EventResult = { status: "added" | "discarded" };

export function EventToolUI({
  args,
  result,
  addResult,
}: ToolRenderProps<EventArgs, EventResult>) {
  const [local, setLocal] = useState<EventResult | undefined>(undefined);
  const resolved = result ?? local;

  const respond = (status: EventResult["status"]) => {
    setLocal({ status });
    addResult?.({ status });
  };

  return (
    <Card>
      <Col gap={3}>
        <Row gap={3}>
          <Icon name="calendar" size={22} color="secondary" />
          <Col gap={0}>
            <Caption>{args.date}</Caption>
            <Text size="sm" weight="medium">
              {args.title}
            </Text>
            <Caption>{args.time}</Caption>
            {args.location ? (
              <Row gap={1} align="center">
                <Icon name="map-pin" size={12} color="secondary" />
                <Caption>{args.location}</Caption>
              </Row>
            ) : null}
          </Col>
        </Row>

        {resolved ? (
          <Row gap={1} align="center">
            <Icon name="check" size={14} color="secondary" />
            <Caption>
              {resolved.status === "added" ? "Added to calendar" : "Dismissed"}
            </Caption>
          </Row>
        ) : (
          <Row gap={2}>
            <Button label="Add to calendar" onClick={() => respond("added")} />
            <Button
              label="Discard"
              variant="ghost"
              onClick={() => respond("discarded")}
            />
          </Row>
        )}
      </Col>
    </Card>
  );
}

const SAMPLE: EventArgs = {
  title: "Q1 roadmap review",
  date: "Friday, Dec 28",
  time: "1:00 – 2:00 PM",
  location: "Cowell Theater",
};

export function EventPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <EventToolUI args={SAMPLE} />
    </div>
  );
}
