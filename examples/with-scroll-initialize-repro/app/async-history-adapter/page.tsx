import { ReproPage } from "../components/ReproPage";

export default function AsyncHistoryAdapterPage() {
  return (
    <ReproPage
      mode="async"
      title="Async ThreadHistoryAdapter.load"
      description="Uses useLocalRuntime(adapter, { adapters: { history } }) where history.load returns ExportedMessageRepository.fromArray(messages)."
    />
  );
}
