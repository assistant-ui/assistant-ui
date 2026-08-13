import { useEffect, useState } from "react";
import { resource } from "@assistant-ui/tap";
import { useAssistantEmit } from "@assistant-ui/store/client";

export type AnyClient = Record<string, any>;

export const flushEvents = () => new Promise((resolve) => setTimeout(resolve));

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
export const MessageClient = resource(useMessageClient);

const useThreadClient = () => {
  const [selected, setSelected] = useState(0);
  return {
    getState: () => ({ selected }),
    setSelected,
  };
};
export const ThreadClient = resource(useThreadClient);

export const createTrackedThread = () => {
  const counters = { mounts: 0, cleanups: 0 };
  const useTracked = () => {
    const [selected, setSelected] = useState(0);
    useEffect(() => {
      counters.mounts++;
      return () => {
        counters.cleanups++;
      };
    }, []);
    return { getState: () => ({ selected }), setSelected };
  };
  return { TrackedThread: resource(useTracked), counters };
};
