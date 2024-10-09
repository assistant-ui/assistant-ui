import { ThreadWelcome, INTERNAL } from "@assistant-ui/react";
import { RefreshCwIcon } from "lucide-react";
import { FC, useState } from "react";
import { useTrieveExtras } from "../runtime/useTrieveRuntime";

const { TooltipIconButton } = INTERNAL;

const TrieveRefreshSuggestions = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshSuggestions = useTrieveExtras((t) => t.refreshSuggestions);
  return (
    <TooltipIconButton
      tooltip="Refresh Suggestions"
      variant="outline"
      className="aui-trieve-thread-welcome-refresh-suggestions"
      disabled={isRefreshing}
      onClick={async () => {
        setIsRefreshing(true);
        try {
          await refreshSuggestions();
        } finally {
          setIsRefreshing(false);
        }
      }}
    >
      <RefreshCwIcon />
    </TooltipIconButton>
  );
};

const TrieveThreadWelcome: FC = () => {
  return (
    <ThreadWelcome.Root>
      <ThreadWelcome.Center>
        <ThreadWelcome.Avatar />
        <ThreadWelcome.Message />
      </ThreadWelcome.Center>
      <TrieveRefreshSuggestions />
      <ThreadWelcome.Suggestions />
    </ThreadWelcome.Root>
  );
};

const exports = {
  RefreshSuggestions: TrieveRefreshSuggestions,
};

export default Object.assign(
  TrieveThreadWelcome,
  exports,
) as typeof TrieveThreadWelcome & typeof exports;
