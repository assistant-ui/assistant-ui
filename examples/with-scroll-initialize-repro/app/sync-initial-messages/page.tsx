import { ReproPage } from "../components/ReproPage";

export default function SyncInitialMessagesPage() {
  return (
    <ReproPage
      mode="sync"
      title="Sync initialMessages"
      description="Uses useLocalRuntime(adapter, { initialMessages }) with overflowing seeded history. The viewport should initialize at the bottom."
    />
  );
}
