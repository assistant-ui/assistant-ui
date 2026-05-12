"use client";

import { useState } from "react";
import type { XuluxTemplate } from "../templates/types";
import { XuluxPoweredBy } from "../XuluxPoweredBy";
import { CategoryGrid } from "./CategoryGrid";
import { PromptInput } from "./PromptInput";
import { TemplatesModal } from "./TemplatesModal";

type Props = {
  headline?: string | undefined;
  placeholder?: string | undefined;
  onStartChat: (prompt: string) => void;
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
    <main className="scrollbar-thin flex flex-1 flex-col items-center overflow-y-auto px-6 pb-24">
      <div className="flex w-full max-w-3xl flex-col items-center pt-[16vh]">
        <h1 className="mb-6 text-center font-semibold text-3xl tracking-tight sm:text-4xl">
          {headline}
        </h1>
        <PromptInput
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={onStartChat}
          placeholder={placeholder}
        />
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
      />
    </main>
  );
}
