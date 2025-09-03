import { Button } from "@/components/ui/button";

export default function Component() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-28 mt-12 text-center">
          <h1 className="mt-4 text-5xl font-bold">Stockbroker</h1>
          <div className="mt-6">
            <Button asChild variant="outline">
              <a href="https://github.com/Yonom/assistant-ui/tree/main/examples/with-langgraph" target="_blank" rel="noopener noreferrer">
                View Source Code
              </a>
            </Button>
          </div>
        </header>

        <div className="h-[700px]">
          <iframe
            title="Stockbroker example"
            className="h-full w-full border-none"
            src="https://assistant-ui-stockbroker.vercel.app/"
          />
        </div>
      </div>
    </div>
  );
}
