import { ChatPageClient } from "./page.client";

// Only needed if NEXT_PUBLIC_ASSISTANT_BASE_URL is unset and no cloud instance is passed to useCloudChat({ cloud }).
export const dynamic = "force-dynamic";

export default function Home() {
  return <ChatPageClient />;
}
