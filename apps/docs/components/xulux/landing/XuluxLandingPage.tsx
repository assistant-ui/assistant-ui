"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { LEARN_SPOTLIGHT_HREF } from "@/lib/xulux/learn/types";
import type { XuluxTemplate } from "../templates/types";
import { XuluxPoweredBy } from "../XuluxPoweredBy";
import { CategoryGrid } from "./CategoryGrid";
import { LandingSuggestions } from "./LandingSuggestions";
import { PromptInput } from "./PromptInput";
import { TemplatesModal } from "./TemplatesModal";

type Props = {
  headline?: string | undefined;
  placeholder?: string | undefined;
  onStartChat: (
    prompt: string,
    start?: {
      source: "typed_prompt" | "suggestion";
      suggestionId?: string;
      suggestionGroup?: string;
      suggestionLabel?: string;
    },
  ) => void;
  onSelectTemplate: (template: XuluxTemplate) => void;
};

export function XuluxLandingPage({
  headline = "What do you want to build?",
  placeholder = "Describe what you want to build with assistant-ui...",
  onStartChat,
  onSelectTemplate,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const handleTemplate = (template: XuluxTemplate) => {
    setTemplatesOpen(false);
    onSelectTemplate(template);
  };

  return (
    <main className="flex flex-1 scrollbar-thin flex-col items-center overflow-y-auto px-6 pb-24">
      <div className="flex w-full max-w-3xl flex-col items-center pt-[16vh]">
        <h1 className="mb-6 text-center text-3xl font-medium tracking-tight sm:text-4xl">
          {headline}
        </h1>
        <PromptInput
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={onStartChat}
          placeholder={placeholder}
        />
        <LandingSuggestions
          onSelectPrompt={(nextPrompt, suggestion) => {
            setPrompt(nextPrompt);
            onStartChat(nextPrompt, {
              source: "suggestion",
              suggestionId: suggestion.id,
              suggestionGroup: suggestion.group,
              suggestionLabel: suggestion.label,
            });
          }}
        />
        <section
          aria-label="Interactive course"
          className="mt-5 flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm"
        >
          <span className="text-muted-foreground">Not sure what to build?</span>
          <Link
            href={LEARN_SPOTLIGHT_HREF}
            className="text-foreground hover:text-foreground/70 inline-flex items-center gap-1 font-medium transition-colors"
          >
            Learn to create your first AI app
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </section>
      </div>

      <div className="mt-16 flex w-full max-w-5xl flex-col gap-12">
        <CategoryGrid
          onBrowseAll={() => setTemplatesOpen(true)}
          onSelectTemplate={handleTemplate}
        />
        <XuluxPoweredBy className="-mt-6 pb-4" />
      </div>

      <TemplatesModal
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelect={handleTemplate}
        openSurface="landing_carousel"
      />
    </main>
  );
}
