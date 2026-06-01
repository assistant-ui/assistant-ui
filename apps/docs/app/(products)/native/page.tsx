"use client";

import {
  ArrowRight,
  Code2,
  Globe,
  Layers,
  RefreshCw,
  Smartphone,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { Button, buttonVariants } from "@/components/ui/button";

import "./phone-mockup.css";

const ANALYTICS_PAGE = "native" as const;

const INSTALL_COMMAND = "npx assistant-ui@latest create --native my-app";

const FEATURES = [
  {
    title: "Built for Expo",
    description:
      "First-class Expo support. Use Expo Router, EAS Build, and the full Expo ecosystem out of the box.",
    icon: Zap,
    iconColor: "text-yellow-400",
  },
  {
    title: "iOS, Android & Web",
    description:
      "Write once, run on every platform. Share UI components and business logic across iOS, Android, and web.",
    icon: Smartphone,
    iconColor: "text-green-400",
  },
  {
    title: "Battle-Tested Runtime",
    description:
      "Powered by the same engine and runtime system behind assistant-ui.com, refined over two years of production use.",
    icon: RefreshCw,
    iconColor: "text-blue-400",
  },
  {
    title: "AI SDK & LangGraph",
    description:
      "Works with Vercel AI SDK, LangGraph, and other popular frameworks. Plug in your existing backend with zero changes.",
    icon: Layers,
    iconColor: "text-purple-400",
  },
  {
    title: "Share Your Runtime Code",
    description:
      "Already using assistant-ui on the web? Reuse the same runtime, tools, and adapters in your React Native app.",
    icon: Code2,
    iconColor: "text-cyan-400",
  },
  {
    title: "Cross-Platform Primitives",
    description:
      "Composable, unstyled primitives — Thread, Composer, Message, and more — designed for native from the ground up.",
    icon: Globe,
    iconColor: "text-orange-400",
  },
] as const;

export default function NativePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="mx-auto max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
            Get the UX of ChatGPT in your own mobile app
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg">
            Beautiful, production-ready AI chat for React Native. Powered by the
            same runtime as assistant-ui, with full Expo support and
            cross-platform code sharing.
          </p>
        </div>

        <CopyCommandButton
          command={INSTALL_COMMAND}
          analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
        />

        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px]">
          <Link
            href="/docs/react-native"
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Getting Started →
          </Link>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <Link
            href="/docs/react-native/migration"
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Migration from Web →
          </Link>
        </div>
      </div>

      {/* Phone mockup */}
      <div className="phone-mockup-section relative">
        <div className="phone-mockup-glow" />
        <div className="phone-mockup-frame">
          <div className="phone-mockup-border" />
          <div className="phone-mockup-notch" />
          <div className="phone-mockup-screen">
            <iframe
              src="https://assistant-ui-expo.vercel.app/"
              className="size-full"
              title="assistant-ui React Native demo"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-medium tracking-tight">
            Why assistant-ui for React Native?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Everything you need to build a world-class AI chat experience on
            mobile — without starting from scratch.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="border-border/50 bg-muted/30 hover:border-border/80 flex flex-col gap-2 rounded-xl border p-4 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon className={cn("size-4", feature.iconColor)} />
                  {feature.title}
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code sharing callout */}
      <div className="border-border/50 bg-muted/30 mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <Code2 className="size-8 text-violet-400" />
        <h3 className="text-xl font-medium tracking-tight">
          Already using assistant-ui?
        </h3>
        <p className="text-muted-foreground max-w-lg">
          Your existing runtime setup, tool definitions, and model adapters work
          with the React Native package. Share the same code between your web
          and mobile apps — only the UI layer changes.
        </p>
        <Button variant="outline" asChild>
          <Link href="/docs/react-native/migration">
            See the migration guide <ArrowRight />
          </Link>
        </Button>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="text-2xl font-medium tracking-tight">
          Start building today
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/docs/react-native">
              Get Started <ArrowRight />
            </Link>
          </Button>
          <Link
            href="/docs/react-native/migration"
            className={buttonVariants({ variant: "outline" })}
          >
            Migration Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
