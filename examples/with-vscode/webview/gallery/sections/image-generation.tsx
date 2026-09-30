import { ImageGeneration } from "@assistant-ui/ui/components/assistant-ui/elements/image-generation.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "image-generation",
    title: "Image generation",
    category: "content",
    notes: "Generating, then the finished placeholder with regenerate.",
    render: () => (
      <div className="flex flex-col gap-3">
        <ImageGeneration prompt="A calm mountain lake at dawn" generating />
        <ImageGeneration
          prompt="A calm mountain lake at dawn"
          generating={false}
          onRegenerate={() => {}}
        />
      </div>
    ),
  },
]);
