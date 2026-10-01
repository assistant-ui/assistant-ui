import {
  ClaudeLogo,
  GeminiLogo,
  OpenAILogo,
} from "@assistant-ui/ui/components/assistant-ui/elements/logos.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "logos",
    title: "Logos",
    category: "chat",
    notes: "logos.tsx: OpenAI, Claude and Gemini marks at two sizes.",
    render: () => (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-8">
          <OpenAILogo className="size-9" />
          <ClaudeLogo className="size-9" />
          <GeminiLogo className="size-9" />
        </div>
        <div className="flex items-center gap-4">
          <OpenAILogo className="size-4" />
          <ClaudeLogo className="size-4" />
          <GeminiLogo className="size-4" />
        </div>
      </div>
    ),
  },
]);
