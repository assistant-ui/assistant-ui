import { WaterfallPage } from "@/lib/waterfall-page";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-4xl text-foreground">
            Waterfall Timeline
          </h1>
          <p className="text-lg text-muted-foreground">
            Span visualization powered by @assistant-ui/react-o11y
          </p>
        </div>

        <WaterfallPage />
      </div>
    </div>
  );
}
