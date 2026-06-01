"use client";

import {
  Card,
  Col,
  Row,
  Text,
  Caption,
  Spacer,
  Icon,
  Button,
} from "../json-ui/primitives";
import type { ToolRenderProps } from "./types";

export type Contact = { name: string; role: string };
export type ContactsArgs = { title: string; people: Contact[] };

export function ContactsToolUI({ args }: ToolRenderProps<ContactsArgs>) {
  const { title, people } = args;
  return (
    <Card>
      <Col gap={3}>
        <Caption>{title}</Caption>
        {people.map((person, index) => (
          <Row key={index} align="center" gap={3}>
            <Icon name="user" size={20} color="secondary" />
            <Col gap={0}>
              <Text size="sm" weight="medium">
                {person.name}
              </Text>
              <Caption>{person.role}</Caption>
            </Col>
            <Spacer />
            <Button label="View" variant="ghost" />
          </Row>
        ))}
      </Col>
    </Card>
  );
}

const SAMPLE: ContactsArgs = {
  title: "Technical staff",
  people: [
    { name: "Ava Chen", role: "Staff Engineer" },
    { name: "James Hill", role: "Member of Technical Staff" },
    { name: "Rohan Mehta", role: "Member of Technical Staff" },
  ],
};

export function ContactsPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <ContactsToolUI args={SAMPLE} />
    </div>
  );
}
