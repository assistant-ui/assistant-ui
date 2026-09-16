import { Link, type Href } from "expo-router";
import { Text, View } from "react-native";

import {
  SHOWCASE_ELEMENTS,
  type ShowcaseSlug,
} from "@/components/showcase/elements";

const SHOWCASE_HREFS = {
  "icon-button": "/showcase/icon-button",
  "typing-indicator": "/showcase/typing-indicator",
  "error-state": "/showcase/error-state",
  "stopped-run": "/showcase/stopped-run",
  "approval-card": "/showcase/approval-card",
  "agent-status": "/showcase/agent-status",
  "tool-timeline": "/showcase/tool-timeline",
  "markdown-text": "/showcase/markdown-text",
  "message-queue": "/showcase/message-queue",
  "conversation-map": "/showcase/conversation-map",
  "voice-conversation": "/showcase/voice-conversation",
} as const satisfies Record<ShowcaseSlug, Href>;

export default function ShowcaseIndex() {
  return (
    <View className="bg-background flex-1 gap-3 p-5">
      {SHOWCASE_ELEMENTS.map(({ slug, title }) => (
        <Link key={slug} href={SHOWCASE_HREFS[slug]}>
          <Text className="text-foreground">{title}</Text>
        </Link>
      ))}
    </View>
  );
}
