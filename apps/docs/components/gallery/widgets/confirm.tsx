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

export type ConfirmArgs = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};
export type ConfirmResult = { approved: boolean };

export function ConfirmToolUI({
  args,
  result,
  addResult,
}: ToolRenderProps<ConfirmArgs, ConfirmResult>) {
  const [local, setLocal] = useState<ConfirmResult | undefined>(undefined);
  const resolved = result ?? local;
  const {
    title,
    description,
    confirmLabel = "Approve",
    cancelLabel = "Decline",
  } = args;

  const respond = (approved: boolean) => {
    setLocal({ approved });
    addResult?.({ approved });
  };

  return (
    <Card>
      <Col gap={3}>
        <Row gap={3}>
          <Icon name="shield-check" size={20} color="secondary" />
          <Col gap={0}>
            <Text size="sm" weight="medium">
              {title}
            </Text>
            {description ? <Caption>{description}</Caption> : null}
          </Col>
        </Row>

        {resolved ? (
          <Row gap={1} align="center">
            <Icon
              name={resolved.approved ? "check" : "x"}
              size={14}
              color="secondary"
            />
            <Caption>{resolved.approved ? "Approved" : "Declined"}</Caption>
          </Row>
        ) : (
          <Row gap={2}>
            <Button label={confirmLabel} onClick={() => respond(true)} />
            <Button
              label={cancelLabel}
              variant="outline"
              onClick={() => respond(false)}
            />
          </Row>
        )}
      </Col>
    </Card>
  );
}

const SAMPLE: ConfirmArgs = {
  title: "Send 3 invites?",
  description:
    "This will email an invitation to acc@okis.dev, dana@acme.co, and wei@acme.co.",
};

export function ConfirmPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <ConfirmToolUI args={SAMPLE} />
    </div>
  );
}
