/**
 * Minimal chat backend that streams a static `generative-ui` message part.
 *
 * In a real integration the agent decides — based on the user prompt — when
 * to emit a `generative-ui` part and what spec to put in it. For the demo
 * we keep the route intentionally trivial so the example can run without
 * any provider keys.
 */

import type { GenerativeUISpec } from "@assistant-ui/react";

export const runtime = "edge";

const demoSpec: GenerativeUISpec = {
  version: 1,
  root: {
    component: "Card",
    props: { title: "Hello from the agent" },
    children: [
      {
        component: "Text",
        children: ["This UI was streamed from the server as a JSON spec."],
      },
      {
        component: "Button",
        props: { label: "Got it", variant: "primary" },
      },
    ],
  },
};

export async function POST(): Promise<Response> {
  const body = JSON.stringify({
    role: "assistant",
    content: [
      { type: "text", text: "Here is a UI for you:" },
      { type: "generative-ui", spec: demoSpec },
    ],
  });

  return new Response(body, {
    headers: { "content-type": "application/json" },
  });
}
