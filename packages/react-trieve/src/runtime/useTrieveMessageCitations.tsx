import { useMessage, getExternalStoreMessage } from "@assistant-ui/react";
import { TrieveMessage } from "../trieve/TrieveMessage";

export const useTrieveMessageCitations = () => {
  const message = useMessage();
  const trieveMessage = getExternalStoreMessage<TrieveMessage>(message);
  return trieveMessage?.citations;
};
