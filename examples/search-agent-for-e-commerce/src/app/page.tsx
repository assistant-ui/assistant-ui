"use client";

import { Suspense } from "react";
import { AssistantModal } from "@/components/ui/assistant-ui/assistant-modal";

function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="fixed bottom-4 right-4 size-12 rounded-full shadow">
        <AssistantModal />
      </div>
    </Suspense>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Home />
    </Suspense>
  );
}
