"use client";

import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerBar,
  ComposerInput,
  ComposerMenu,
  ComposerModelItem,
  ComposerModelTrigger,
  ComposerSend,
  ComposerToolbar,
  type ComposerModel,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

const MODELS: ComposerModel[] = [
  { name: "Fable 5", meta: "1M ctx" },
  { name: "Opus 5", meta: "400k ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
];

const LONG_MODELS: ComposerModel[] = [
  { name: "Fable 5", meta: "1M ctx" },
  { name: "Opus 5 with extended thinking (preview)", meta: "400k ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
  { name: "Self-hosted Llama 4 Maverick", meta: "128k ctx" },
  { name: "Gemini 3 Pro", meta: "2M ctx" },
];

function Picker({
  open,
  model,
  models = MODELS,
}: {
  open: boolean;
  model: string;
  models?: ComposerModel[];
}) {
  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className={open ? "h-52" : "h-0"} />
      <Composer>
        <ComposerBar>
          <ComposerInput
            value=""
            placeholder="Ask anything"
            onChange={noop}
            onSubmit={noop}
          />
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton onClick={noop} />
              <div className="relative">
                <ComposerMenu open={open}>
                  {models.map((entry) => (
                    <ComposerModelItem
                      key={entry.name}
                      entry={entry}
                      selected={entry.name === model}
                      onClick={noop}
                    />
                  ))}
                </ComposerMenu>
                <ComposerModelTrigger
                  model={model}
                  open={open}
                  onClick={noop}
                />
              </div>
            </ComposerActions>
            <ComposerActions>
              <ComposerSend streaming={false} idle onClick={noop} />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "closed",
    label: "Closed",
    note: "The picker rests as a quiet label in the rail.",
    Component: () => <Picker open={false} model="Fable 5" />,
  },
  {
    key: "long-content",
    label: "Long names",
    note: "A longer list with a long model name selected.",
    Component: () => (
      <Picker
        open
        model="Opus 5 with extended thinking (preview)"
        models={LONG_MODELS}
      />
    ),
  },
]);
