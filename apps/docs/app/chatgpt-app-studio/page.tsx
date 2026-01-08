"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Terminal, Sparkles, Wrench, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatGptAppStudioPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  return (
    <div className="container mx-auto max-w-7xl space-y-16 px-4 py-12">
      <div className="mx-auto flex w-fit flex-col items-center space-y-6 text-center">
        <div className="flex cursor-default rounded-full bg-border p-px">
          <div className="flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-sm">
            <Sparkles className="size-4 opacity-50" />
            <span className="text-foreground/60">OpenAI Apps SDK</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="pointer-events-none select-none font-bold text-5xl tracking-tight lg:text-7xl">
            <h1 className="inline text-foreground">ChatGPT App Studio</h1>
          </div>

          <p className="max-w-[600px] text-balance font-light text-lg text-muted-foreground">
            Build and preview ChatGPT Apps locally. A development workbench with
            live preview, mock tool responses, and production export.
          </p>
        </div>
      </div>

      <div id="installation" className="space-y-8">
        <div className="text-center">
          <h2 className="font-medium text-3xl">Get Started</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <Box>
            <BoxContent>
              <div className="flex items-center justify-between">
                <code className="text-sm">
                  npx chatgpt-app-studio my-chatgpt-app
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard("npx chatgpt-app-studio my-chatgpt-app")
                  }
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </BoxContent>
          </Box>

          <div className="text-center text-muted-foreground text-sm">
            Then follow the prompts to set up your project.
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Features</h2>
          <p className="text-muted-foreground text-xl">
            Everything you need to build ChatGPT Apps.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Play className="size-5" />}
            title="Live Preview"
            description="See your widgets render in real-time as you develop. Test across desktop, tablet, and mobile viewports."
          />
          <FeatureCard
            icon={<Wrench className="size-5" />}
            title="Mock Tool Responses"
            description="Simulate tool calls with configurable responses. Test success, error, and edge cases without a backend."
          />
          <FeatureCard
            icon={<Terminal className="size-5" />}
            title="MCP Server Scaffold"
            description="Optional MCP server template included. Run both frontend and backend with a single command."
          />
          <FeatureCard
            icon={<Sparkles className="size-5" />}
            title="SDK Guide Assistant"
            description="Built-in AI assistant that knows the Apps SDK docs. Get help with configuration and debugging."
          />
          <FeatureCard
            icon={<Copy className="size-5" />}
            title="Production Export"
            description="Export your widgets as self-contained HTML bundles ready for deployment to ChatGPT."
          />
          <FeatureCard
            icon={<Check className="size-5" />}
            title="Display Modes"
            description="Preview inline, pip, and fullscreen modes. See exactly how your app will appear in ChatGPT."
          />
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">How It Works</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          <Step number={1} title="Scaffold your project">
            Run the CLI to create a new project with the workbench, example
            widgets, and optionally an MCP server.
          </Step>
          <Step number={2} title="Develop your widgets">
            Build React components that use the window.openai SDK. The workbench
            provides live preview and hot reload.
          </Step>
          <Step number={3} title="Test with mock data">
            Configure mock tool responses to test different scenarios. Simulate
            user interactions and edge cases.
          </Step>
          <Step number={4} title="Export for production">
            Generate self-contained HTML bundles with all dependencies inlined.
            Deploy to ChatGPT with confidence.
          </Step>
        </div>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h2 className="mb-2 font-medium text-3xl">Coming Soon</h2>
          <p className="text-muted-foreground">
            We&apos;re actively developing new features.
          </p>
        </div>

        <div className="mx-auto max-w-2xl text-center text-muted-foreground">
          <ul className="space-y-2">
            <li>Multi-app workspace support</li>
            <li>Visual regression testing</li>
            <li>Direct ChatGPT deployment integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-dashed">
      {children}
    </div>
  );
}

function BoxContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed p-6">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground/60">
        {icon}
      </div>
      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-foreground/60 text-sm">
        {number}
      </div>
      <div className="pt-0.5">
        <h3 className="mb-1 font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{children}</p>
      </div>
    </div>
  );
}
