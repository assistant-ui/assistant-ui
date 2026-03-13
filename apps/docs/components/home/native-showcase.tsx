"use client";

import { ArrowRight, Code2, Smartphone, Zap } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./native-showcase.css";

// ── Static phone chat preview ──────────────────────────────────────────────

function PhoneChatPreview() {
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0.5 font-semibold text-[9px] text-foreground/60">
        <span>9:41</span>
        <span className="flex gap-0.5">
          <span>▲▲▲</span>
        </span>
      </div>

      {/* Nav bar */}
      <div className="flex items-center gap-2 border-b px-3 pt-1 pb-2">
        <div className="flex size-6 items-center justify-center rounded-full bg-primary/15">
          <span className="font-bold text-[9px] text-primary">AI</span>
        </div>
        <span className="font-semibold text-[11px]">Assistant</span>
        <span className="ml-auto text-[9px] text-emerald-500">● online</span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2.5 overflow-hidden px-2.5 py-2.5">
        {/* User */}
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-primary px-2.5 py-1.5">
            <p className="text-[10px] text-primary-foreground leading-relaxed">
              Summarize my meeting notes
            </p>
          </div>
        </div>

        {/* AI */}
        <div className="flex items-end justify-start gap-1.5">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <span className="font-bold text-[8px] text-primary">AI</span>
          </div>
          <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-muted px-2.5 py-1.5">
            <p className="text-[10px] text-foreground leading-relaxed">
              Here&apos;s a summary:
            </p>
            <ul className="mt-1 space-y-0.5 text-[10px] text-foreground leading-relaxed">
              <li>• Q2 roadmap approved</li>
              <li>• 3 action items</li>
              <li>• Next sync: Friday</li>
            </ul>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex items-end gap-1.5">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <span className="font-bold text-[8px] text-primary">AI</span>
          </div>
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t px-2.5 py-2">
        <div className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5">
          <span className="flex-1 text-[10px] text-muted-foreground">
            Message…
          </span>
          <div className="flex size-4 items-center justify-center rounded-full bg-primary">
            <ArrowRight className="size-2.5 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="phone-home-section relative mx-auto" style={{ width: 220 }}>
      <div className="phone-home-glow" />
      <div className="phone-home-frame">
        <div className="phone-home-border" />
        <div className="phone-home-notch" />
        <div className="phone-home-screen">
          <PhoneChatPreview />
        </div>
      </div>
    </div>
  );
}

// ── Features ───────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Smartphone,
    color: "text-violet-400",
    title: "iOS, Android & Web",
    desc: "Write once, run everywhere with full Expo support.",
  },
  {
    icon: Zap,
    color: "text-yellow-400",
    title: "Same runtime, new surface",
    desc: "Reuse tools, adapters, and models from your web app.",
  },
  {
    icon: Code2,
    color: "text-cyan-400",
    title: "Composable primitives",
    desc: "Thread, Composer, Message — designed for native.",
  },
] as const;

// ── Main section ──────────────────────────────────────────────────────────

export function NativeShowcase() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Left: text */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
            React Native
          </p>
          <h2 className="font-medium text-3xl tracking-tight">
            AI chat for mobile, too
          </h2>
          <p className="max-w-md text-muted-foreground">
            Production-ready AI chat for iOS, Android, and web. Powered by the
            same battle-tested runtime — with first-class Expo support and full
            cross-platform code sharing.
          </p>
        </div>

        <ul className="flex flex-col gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-4 shrink-0", f.color)} />
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/native" className={buttonVariants({ size: "sm" })}>
            Explore React Native <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/docs/react-native"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Docs
          </Link>
        </div>
      </div>

      {/* Right: phone */}
      <div className="flex items-center justify-center py-8 lg:py-0">
        <PhoneMockup />
      </div>
    </section>
  );
}
