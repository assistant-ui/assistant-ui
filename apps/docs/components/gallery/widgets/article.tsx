"use client";

import {
  Card,
  Col,
  Row,
  Title,
  Text,
  Caption,
  Button,
} from "../json-ui/primitives";
import type { ToolRenderProps } from "./types";

export type ArticleArgs = {
  eyebrow?: string;
  title: string;
  body: string;
};

export function ArticleToolUI({ args }: ToolRenderProps<ArticleArgs>) {
  const { eyebrow, title, body } = args;
  return (
    <Card>
      <Col gap={2}>
        {eyebrow ? <Caption>{eyebrow}</Caption> : null}
        <Title value={title} size="md" />
        <Text size="sm" color="secondary">
          {body}
        </Text>
        <Row gap={2}>
          <Button label="Read more" />
          <Button label="Save" variant="ghost" />
        </Row>
      </Col>
    </Card>
  );
}

const SAMPLE: ArticleArgs = {
  eyebrow: "Breakout session",
  title: "Orchestrating agents at scale",
  body: "Connect, create, and deploy enterprise agents with a new suite of agentic platform tools.",
};

export function ArticlePreview() {
  return (
    <div className="w-full max-w-[340px]">
      <ArticleToolUI args={SAMPLE} />
    </div>
  );
}
