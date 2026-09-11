"use client";

import { useState } from "react";
import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerBar,
  ComposerContext,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
} from "@/components/assistant-ui/elements/composer";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const PHASES = [1200, 1200, 0] as const;
const MESSAGES = [54, 118, 162] as const;

export function ComposerContextDemo() {
  const { phase } = useStoryPhases(PHASES);
  const [value, setValue] = useState("");

  return (
    <Composer>
      <ComposerBar>
        <ComposerInput
          value={value}
          placeholder="Ask anything"
          onChange={(event) => setValue(event.target.value)}
          onSubmit={() => setValue("")}
        />
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={() => undefined} />
          </ComposerActions>
          <ComposerActions>
            <ComposerContext
              usage={{
                system: 12,
                tools: 8,
                messages: MESSAGES[Math.min(phase, 2)] ?? 162,
                total: 200,
              }}
            />
            <ComposerSend
              streaming={false}
              idle={value.length === 0}
              onClick={() => setValue("")}
            />
          </ComposerActions>
        </ComposerToolbar>
      </ComposerBar>
    </Composer>
  );
}
