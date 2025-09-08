import { Shadcn } from "@/components/shadcn/Shadcn";
import { DocsRuntimeProvider } from "../../DocsRuntimeProvider";

export default function Component() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-28 mt-12 text-center">
          <h1 className="mt-4 text-5xl font-bold">AI SDK + Chat Persistence</h1>
        </header>

        <div className="h-[700px]">
          <DocsRuntimeProvider>
            <Shadcn />
          </DocsRuntimeProvider>
        </div>
      </div>
    </div>
  );
}
