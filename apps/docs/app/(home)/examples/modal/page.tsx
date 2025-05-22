import { ModalChat } from "@/components/modal/ModalChat";
import { DocsRuntimeProvider } from "../../DocsRuntimeProvider";

export default function Component() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-28 mt-12 text-center">
          <h1 className="mt-4 text-5xl font-bold">Modal</h1>
        </header>

        <div className="">
          <DocsRuntimeProvider>
            <ModalChat />
          </DocsRuntimeProvider>
        </div>
      </div>
    </div>
  );
}
