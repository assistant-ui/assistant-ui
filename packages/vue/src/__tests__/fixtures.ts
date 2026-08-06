import { useEffect, useState } from "react";
import { resource } from "@assistant-ui/tap";
import {
  Derived,
  useAssistantEmit,
  useClientResource,
} from "@assistant-ui/store/client";

export type AnyClient = Record<string, any>;

export const flushEvents = () => new Promise((resolve) => setTimeout(resolve));

export const trackers = { threadCleanups: 0 };

const useMessageClient = ({ id }: { id: string }) => {
  const emit = useAssistantEmit();
  const [text, setText] = useState("");
  return {
    getState: () => ({ id, text }),
    setText,
    ping: (value: string) =>
      emit("message.pinged" as never, { id, value } as never),
  };
};
const MessageClient = resource(useMessageClient);

const useThreadClient = () => {
  const [selected, setSelected] = useState(0);
  const m0 = useClientResource(MessageClient({ id: "m0" }));
  const m1 = useClientResource(MessageClient({ id: "m1" }));
  const messages = [m0, m1];
  useEffect(() => {
    return () => {
      trackers.threadCleanups++;
    };
  }, []);
  return {
    getState: () => ({ selected }),
    setSelected,
    message: ({ index }: { index: number }) => messages[index]!.methods,
  };
};
export const ThreadClient = resource(useThreadClient);

export const messageDerived = () =>
  Derived({
    source: "thread",
    query: {},
    get: (aui: AnyClient) =>
      aui.thread.message({ index: aui.thread.getState().selected }),
  } as never);
