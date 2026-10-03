import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { buttonVariants } from "@/components/ui/button";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Share an AI chat";
const description =
  "Use harness-sdk with assistant-ui and Assistant Cloud to let multiple people join the same AI conversation.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...createOgMetadata(title, description),
};

const SETUP = `npx --package=https://pkg.pr.new/assistant-ui/assistant-ui/assistant-ui@8754 \\
  assistant-ui cloud setup shared-chat \\
  --use-npm --access-code MULTIPLAYER-2026
cd shared-chat
# Add OPENAI_API_KEY to .env.local
npm run dev`;

const RUNTIME = `const config = AuiConfig({
  threads: HarnessCloudThreadList({
    url: "/api/chat",
    origin: process.env.NEXT_PUBLIC_ASSISTANT_HARNESS_URL!,
    workspaceId: process.env.NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID!,
    credential,
    threadId,
    onThreadIdChange,
  }),
});`;

export default function HarnessSetupPage() {
  return (
    <PageFrame pad="sub" className="isolate antialiased">
      <header className="flex flex-col gap-6">
        <p className="text-muted-foreground font-mono text-base sm:text-sm">
          harness-sdk
        </p>
        <h1 className={cn(typePage, "max-w-[35ch]")}>{title}.</h1>
        <p className={cn(typeDeck, "max-w-[52ch] text-base sm:text-[15px]")}>
          An alpha runtime for a conversation shared by your team. Everyone sees
          the same messages and the assistant&apos;s response as it streams.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a href="#setup" className={buttonVariants()}>
            Set up a shared chat
          </a>
          <Link href="/components/bundles" className="hover:underline">
            Choose your chat UI
          </Link>
        </div>
      </header>

      <section className="border-foreground/10 mt-16 grid gap-10 border-t py-10 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <h2 className={typeSection}>Your UI. A shared thread.</h2>
          <p className="text-muted-foreground max-w-[56ch] text-base sm:text-sm">
            assistant-ui renders the chat. harness-sdk connects it to a thread
            hosted by Assistant Cloud. Your app&apos;s AI SDK route supplies the
            model and tools.
          </p>
          <p className="text-muted-foreground max-w-[56ch] text-base sm:text-sm">
            Keep your Thread, Composer, Message, and tool components. The shared
            runtime carries the conversation between connected clients.
          </p>
        </div>
        <CodeBlock
          title="app/assistant.tsx · abridged from the cloud-harness starter"
          copyText={RUNTIME}
          className="my-0"
        >
          <Highlight code={RUNTIME} language="tsx" />
        </CodeBlock>
      </section>

      <section
        id="setup"
        className="border-foreground/10 scroll-mt-20 border-t py-10"
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-5">
            <h2 className={typeSection}>Start with Assistant Cloud.</h2>
            <p className="text-muted-foreground max-w-[56ch] text-base sm:text-sm">
              The hackathon CLI preview opens browser sign-in, lets you choose
              or create a project, and provisions a harness. It writes the
              project configuration into a new chat app.
            </p>
            <p className="text-muted-foreground max-w-[56ch] text-base sm:text-sm">
              Redeem the event code for one harness in your project. Code
              redemption closes at midnight Pacific after October 3.
            </p>
            <a
              href="https://github.com/assistant-ui/assistant-ui/pull/8754"
              className="w-fit hover:underline"
            >
              CLI preview and release status
            </a>
          </div>
          <CodeBlock
            title="Terminal · hackathon CLI preview"
            copyText={SETUP}
            className="my-0"
          >
            <Highlight code={SETUP} language="bash" />
          </CodeBlock>
        </div>
      </section>

      <section className="border-foreground/10 flex flex-col gap-6 border-t py-10">
        <h2 className={typeSection}>Open the same link twice.</h2>
        <ol role="list" className="grid gap-8 md:grid-cols-3">
          <li className="flex flex-col gap-3">
            <h3 className="font-medium">Send a message</h3>
            <p className="text-muted-foreground text-base sm:text-sm">
              Open the local app in two browser windows. Type in either window
              and watch the reply arrive in both.
            </p>
          </li>
          <li className="flex flex-col gap-3">
            <h3 className="font-medium">Share this chat</h3>
            <p className="text-muted-foreground text-base sm:text-sm">
              The starter&apos;s share button copies a link to the current
              thread. Deploy or expose the app before sharing it across devices.
            </p>
          </li>
          <li className="flex flex-col gap-3">
            <h3 className="font-medium">Make it yours</h3>
            <p className="text-muted-foreground text-base sm:text-sm">
              Add your tools and pick components from the catalog. Configure the
              deployed chat route in your harness&apos;s backend allowlist.
            </p>
          </li>
        </ol>
      </section>
    </PageFrame>
  );
}
