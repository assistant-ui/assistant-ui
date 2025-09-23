import { AssistantWithProvider } from "./assistant-with-provider";
import { ProviderContextProvider } from "@/contexts/provider-context";

export default function Home() {
  return (
    <ProviderContextProvider>
      <AssistantWithProvider />
    </ProviderContextProvider>
  );
}
