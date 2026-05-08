import { useState } from "react";
import { useProduct } from "@/components/agent-playground/contexts/ProductContext";
import type { Template } from "@/components/agent-playground/lib/templates";
import { PromptInput } from "./PromptInput";
import { CategoryGrid } from "./CategoryGrid";
import { TemplatesModal } from "./TemplatesModal";

type Props = {
  headline?: string | undefined;
  placeholder?: string | undefined;
  onStartChat: (prompt: string) => void;
  onSelectTemplate: (template: Template) => void;
};

export function LandingPage({
  headline,
  placeholder,
  onStartChat,
  onSelectTemplate,
}: Props) {
  const product = useProduct();
  const [prompt, setPrompt] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const resolvedHeadline = headline ?? product.prompt.headline;
  const resolvedPlaceholder = placeholder ?? product.prompt.placeholder;

  const handleSubmit = (value: string) => {
    onStartChat(value);
  };

  const handleTemplate = (t: Template) => {
    setTemplatesOpen(false);
    onSelectTemplate(t);
  };

  return (
    <main className="scrollbar-thin flex flex-1 flex-col items-center overflow-y-auto px-6 pb-24">
      <div className="flex w-full max-w-3xl flex-col items-center pt-[16vh]">
        <h1 className="mb-6 text-center font-semibold text-3xl tracking-tight sm:text-4xl">
          {resolvedHeadline}
        </h1>
        <PromptInput
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={handleSubmit}
          placeholder={resolvedPlaceholder}
        />
      </div>

      <div className="mt-16 flex w-full max-w-5xl flex-col gap-12">
        <CategoryGrid
          onBrowseAll={() => setTemplatesOpen(true)}
          onSelectTemplate={handleTemplate}
        />
      </div>

      <TemplatesModal
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelect={handleTemplate}
      />
    </main>
  );
}
