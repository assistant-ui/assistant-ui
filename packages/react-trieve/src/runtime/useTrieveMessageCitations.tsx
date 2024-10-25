import { useMessage, getExternalStoreMessage } from "../../../react/src";
import { TrieveMessage } from "../trieve/TrieveMessage";

export const useTrieveMessageCitations = () => {
  const message = useMessage();
  const trieveMessage = getExternalStoreMessage<TrieveMessage>(message);
  return trieveMessage?.citations;
};
