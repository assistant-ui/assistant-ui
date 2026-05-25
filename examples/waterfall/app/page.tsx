import { WaterfallPage } from "@/lib/waterfall-page";

export default function Home() {
  return (
    <div className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-foreground mb-2 text-4xl font-bold">
            Waterfall Timeline
          </h1>
          <p className="text-muted-foreground text-lg">
            Span visualization powered by @assistant-ui/react-o11y
          </p>
        </div>

        <WaterfallPage />
      </div>
    </div>
  );
}
