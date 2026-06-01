"use client";

import {
  Card,
  Col,
  Row,
  Title,
  Text,
  Caption,
  Spacer,
  Divider,
  Icon,
  Button,
} from "../json-ui/primitives";
import type { ToolRenderProps } from "./types";

export type PlaylistTrack = { name: string; artist: string };
export type PlaylistArgs = { title: string; tracks: PlaylistTrack[] };

export function PlaylistToolUI({ args }: ToolRenderProps<PlaylistArgs>) {
  const { title, tracks } = args;
  return (
    <Card>
      <Col gap={3}>
        <Row align="center" gap={2}>
          <Icon name="music" size={18} color="secondary" />
          <Title value={title} size="md" />
        </Row>
        {tracks.map((track, index) => (
          <Row key={index} align="center" gap={3}>
            <Caption>{String(index + 1)}</Caption>
            <Col gap={0}>
              <Text size="sm" weight="medium">
                {track.name}
              </Text>
              <Caption>{track.artist}</Caption>
            </Col>
            <Spacer />
            <Icon name="play" size={16} color="secondary" />
          </Row>
        ))}
        <Divider />
        <Button label="Play all" block />
      </Col>
    </Card>
  );
}

const SAMPLE: PlaylistArgs = {
  title: "Morning focus",
  tracks: [
    { name: "Weightless", artist: "Marconi Union" },
    { name: "An Ending", artist: "Brian Eno" },
    { name: "Saudade", artist: "Thievery Corporation" },
  ],
};

export function PlaylistPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <PlaylistToolUI args={SAMPLE} />
    </div>
  );
}
