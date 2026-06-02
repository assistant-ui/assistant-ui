"use client";

import {
  Card,
  Col,
  Row,
  Text,
  Caption,
  Spacer,
  Divider,
  Box,
  Icon,
} from "@/components/generative-ui";
import type { ToolRenderProps } from "./types";

export type FlightArgs = {
  number: string;
  date: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  status: string;
  progress: number;
};

export function FlightToolUI({ args }: ToolRenderProps<FlightArgs>) {
  const {
    number,
    date,
    origin,
    destination,
    departTime,
    arriveTime,
    status,
    progress,
  } = args;
  return (
    <Card background="linear-gradient(135deg, #378CD1 0%, #2B67AC 100%)">
      <Col gap={3}>
        <Row align="center" gap={2}>
          <Icon name="plane" size={16} color="white" />
          <Caption color="white">{number}</Caption>
          <Spacer />
          <Caption color="white-50">{date}</Caption>
        </Row>
        <Divider flush tone="light" />
        <Col gap={3}>
          <Row align="center">
            <Text color="white">{origin}</Text>
            <Spacer />
            <Text color="white">{destination}</Text>
          </Row>
          <Box height={6} radius="full" background="rgba(255, 255, 255, 0.25)">
            <Box
              width={`${Math.round(progress * 100)}%`}
              height={6}
              radius="full"
              background="white"
            />
          </Box>
          <Row align="center">
            <Row align="center" gap={2}>
              <Text size="sm" color="white">
                {departTime}
              </Text>
              <Text size="sm" color="white-50">
                {status}
              </Text>
            </Row>
            <Spacer />
            <Row align="center" gap={2}>
              <Text size="sm" color="white-50">
                {status}
              </Text>
              <Text size="sm" color="white">
                {arriveTime}
              </Text>
            </Row>
          </Row>
        </Col>
      </Col>
    </Card>
  );
}

const SAMPLE: FlightArgs = {
  number: "PA 845",
  date: "Fri, Apr 25",
  origin: "San Francisco",
  destination: "London",
  departTime: "4:00 PM",
  arriveTime: "10:25 AM +1",
  status: "On time",
  progress: 0.62,
};

export function FlightPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <FlightToolUI args={SAMPLE} />
    </div>
  );
}
