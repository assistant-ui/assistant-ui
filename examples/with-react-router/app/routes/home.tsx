import { Thread } from "@/components/assistant-ui/thread";

export function meta() {
  return [
    { title: "assistant-ui with React Router" },
    { name: "description", content: "assistant-ui example with React Router" },
  ];
}

export default function Home() {
  return (
    <main className="h-dvh">
      <Thread />
    </main>
  );
}
