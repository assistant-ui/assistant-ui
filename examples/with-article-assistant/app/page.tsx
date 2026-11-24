import { Article } from "@/components/article-view";
import { Assistant } from "@/components/assistant";

export default function Home() {
  return (
    <Assistant>
      <main className="h-dvh overflow-y-auto">
        <Article />
      </main>
    </Assistant>
  );
}
