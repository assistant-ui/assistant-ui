import { useState } from "react";
import { useAui, type DataMessagePartComponent } from "@assistant-ui/react";
import { ErrorState } from "@assistant-ui/ui/components/assistant-ui/elements/error-state.tsx";
import { MessageAttachments } from "@assistant-ui/ui/components/assistant-ui/elements/message-attachment.tsx";
import { Suggestions } from "@assistant-ui/ui/components/assistant-ui/elements/suggestions.tsx";
import {
  CHAT_DELIVERABLES_DATA,
  CHAT_FOLLOWUPS_DATA,
  CHAT_RETRY_DATA,
  type ChatDeliverablesData,
  type ChatFollowupsData,
  type ChatRetryData,
} from "../../src/fixtures/rich/chat";
import { defineFixtureUI } from "../define-fixture-ui";

const Followups: DataMessagePartComponent<ChatFollowupsData> = ({ data }) => {
  const aui = useAui();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Suggestions
      className="my-2"
      suggestions={data.suggestions}
      selectedSuggestion={selected}
      cycle={0}
      variant="pills"
      onSuggestion={(suggestion) => {
        setSelected(suggestion);
        aui.thread().append(suggestion);
      }}
    />
  );
};

const Deliverables: DataMessagePartComponent<ChatDeliverablesData> = ({
  data,
}) => <MessageAttachments className="my-2" attachments={data.files} />;

const Retry: DataMessagePartComponent<ChatRetryData> = ({ data }) => {
  const aui = useAui();
  return (
    <ErrorState
      className="my-2"
      title={data.title}
      detail={data.detail}
      retrying={false}
      onRetry={() => aui.message().reload()}
    />
  );
};

export default defineFixtureUI({
  dataUIs: [
    { name: CHAT_FOLLOWUPS_DATA, render: Followups },
    { name: CHAT_DELIVERABLES_DATA, render: Deliverables },
    { name: CHAT_RETRY_DATA, render: Retry },
  ],
});
