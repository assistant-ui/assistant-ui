import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageFrame } from "@/components/shared/page-frame";
import { PageHero } from "@/components/shared/page-hero";
import { CodeFilesDemo } from "@/components/pages/platforms/code-files-demo";

export const metadata: Metadata = {
  title: "assistant-ui for Vue",
  description:
    "The assistant-ui runtime for Vue 3.5 and Nuxt, through a provider, composables, and unstyled primitives.",
};

const PRIMITIVES = [
  "Thread",
  "ThreadList",
  "ThreadListItem",
  "Message",
  "Composer",
  "ActionBar",
  "Attachment",
  "BranchPicker",
  "ChainOfThought",
  "Error",
  "Suggestion",
] as const;

const FEATURES = [
  {
    title: "Nuxt and Vite",
    description:
      "Stream from a Nitro route, or from any server that returns an AI SDK UI message stream.",
  },
  {
    title: "Registry components",
    description:
      "Styled chat components install from the assistant-ui registry with shadcn-vue.",
  },
  {
    title: "Shared runtime",
    description:
      "The same runtime as the React package, exposed through a provider and composables.",
  },
] as const;

const COMPONENT = `<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { AISDKChat } from "@assistant-ui/ai-sdk";
import Thread from "~/components/assistant-ui/thread.vue";

const config = AuiConfig({
  threads: AISDKChat(),
});
</script>

<template>
  <AuiProvider :config="config">
    <div class="h-dvh">
      <Thread />
    </div>
  </AuiProvider>
</template>`;

const ROUTE = `import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export default defineEventHandler(async (event) => {
  const { messages, system } = await readBody<{
    messages: UIMessage[];
    system?: string;
  }>(event);

  const result = streamText({
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
    system,
  });

  return result.toUIMessageStreamResponse();
});`;

export default function VuePage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="AI chat, in Vue."
        deck="The same runtime as the React package, for Vue 3.5 and Nuxt, through a provider, composables, and unstyled primitives."
        primary={{ label: "Read the docs", href: "/docs/vue" }}
        secondary={{ install: "npm install @assistant-ui/vue" }}
        demo={
          <CodeFilesDemo
            files={[
              {
                path: "app/components/Assistant.client.vue",
                language: "vue",
                code: COMPONENT,
              },
              { path: "server/api/chat.post.ts", language: "ts", code: ROUTE },
            ]}
            caption="The Nuxt quickstart's two files. Vue has no hosted demo to run here."
          />
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">The primitives</p>
            <span className="text-muted-foreground text-sm tabular-nums">
              {PRIMITIVES.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {PRIMITIVES.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            Unstyled Vue components with the same parts as the web primitives,
            such as ThreadPrimitiveViewport and ComposerPrimitiveInput.
          </p>
        </section>

        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-3 md:gap-0 md:divide-x md:py-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="md:px-8 md:first:ps-0 md:last:pe-0"
            >
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          The same runtime ships for the{" "}
          <Link
            href="/react"
            className="text-foreground font-medium transition-colors"
          >
            web
          </Link>
          ,{" "}
          <Link
            href="/react-native"
            className="text-foreground font-medium transition-colors"
          >
            React Native
          </Link>
          , and the{" "}
          <Link
            href="/ink"
            className="text-foreground font-medium transition-colors"
          >
            terminal
          </Link>
          .
        </p>
        <Link
          href="/docs/vue/quickstart"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Quickstart
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}
