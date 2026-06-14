"use client";

import { CopyCommandButton } from "@/components/home/copy-command-button";
import { NpmDownloads } from "@/components/home/npm-downloads";
import Image from "next/image";

export function Hero() {
  return (
    <section className="flex flex-col pb-4 md:pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 pb-1">
          <h1 className="max-w-[30ch] text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
            A frontend for your AI agents
          </h1>
          <p className="text-muted-foreground max-w-[48ch] text-lg text-pretty">
            React primitives for building AI chat interfaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center">
          <CopyCommandButton withPromptOption />
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-3 text-[13px]">
          <a
            href="https://github.com/assistant-ui/assistant-ui/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            MIT License
          </a>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <a
            href="https://www.npmjs.com/package/@assistant-ui/react"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <NpmDownloads />
          </a>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <a
            href="https://www.ycombinator.com/companies/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex w-full items-center gap-1.5 transition-colors sm:w-auto"
          >
            Backed by
            <Image
              src="/icons/yc_logo.png"
              alt="Y Combinator"
              height={18}
              width={18}
            />
            Combinator
          </a>
        </div>
      </div>
    </section>
  );
}
