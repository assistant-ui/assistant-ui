import { useState } from "react";
import { resource } from "@assistant-ui/tap";
import type {} from "@assistant-ui/store";

export type DemoMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    thread: {
      methods: {
        getState: () => { messages: DemoMessage[]; isRunning: boolean };
        append: (text: string) => void;
      };
    };
    composer: {
      methods: {
        getState: () => { text: string };
        setText: (text: string) => void;
      };
    };
  }
}

let nextId = 0;

const useThreadScope = () => {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  return {
    getState: () => ({ messages, isRunning }),
    append: (text: string) => {
      setMessages((prev) => [...prev, { id: nextId++, role: "user", text }]);
      setIsRunning(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: nextId++, role: "assistant", text: `Echo: ${text}` },
        ]);
        setIsRunning(false);
      }, 600);
    },
  };
};
export const ThreadScope = resource(useThreadScope);

const useComposerScope = () => {
  const [text, setText] = useState("");
  return {
    getState: () => ({ text }),
    setText,
  };
};
export const ComposerScope = resource(useComposerScope);
