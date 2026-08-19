"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const ANALYTICS_PAGE = "native" as const;

const INSTALL_COMMAND = "npx assistant-ui@latest create --native my-app";

const DEMO_SRC = "https://assistant-ui-expo.vercel.app/";

const FEATURES = [
  {
    title: "Built for Expo",
    description:
      "Expo Router, EAS Build, and the Expo ecosystem work out of the box.",
  },
  {
    title: "iOS, Android, and web",
    description: "Share UI and logic across every platform from one codebase.",
  },
  {
    title: "Shared runtime",
    description:
      "The same engine as the web SDK. AI SDK, LangGraph, tools, and adapters carry over.",
  },
  {
    title: "Native primitives",
    description:
      "Composable, unstyled Thread, Composer, Message, and ThreadList primitives built for native.",
  },
] as const;

export default function NativePage() {
  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        <header className="max-w-2xl">
          <h1 className={typePage}>React Native</h1>
          <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
            Native Thread, Composer, and Message primitives. Same runtime as the
            web SDK. Expo, iOS, Android, and web.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <CopyCommandButton
              command={INSTALL_COMMAND}
              analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
            />
            <Link
              href="/docs/react-native"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Read the docs
            </Link>
          </div>
        </header>

        <NativeDemo />
      </div>

      <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-1.5">
            <dt className="text-[15px] font-medium">{feature.title}</dt>
            <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {feature.description}
            </dd>
          </div>
        ))}
      </dl>

      <footer>
        <Link
          href="/docs/react-native/migration"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Migration from web
        </Link>
      </footer>
    </PageFrame>
  );
}

function NativeDemo() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(DEMO_SRC);
  }, []);

  return (
    <div className="bg-muted/40 mx-auto w-full max-w-[320px] overflow-hidden rounded-3xl lg:mx-0">
      {src ? (
        <iframe
          src={src}
          title="assistant-ui React Native demo"
          className="aspect-[9/19.5] w-full border-0"
        />
      ) : (
        <div className="aspect-[9/19.5] w-full" aria-hidden />
      )}
    </div>
  );
}
