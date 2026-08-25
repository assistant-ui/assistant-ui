"use client";

import { useState } from "react";
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
} from "@/components/elements/composer";

const MODELS: ComposerModel[] = [
  { name: "Fable 5", meta: "1M ctx" },
  { name: "Opus 5", meta: "400k ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
];

export function ComposerModelsDemo() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("Fable 5");
  const [open, setOpen] = useState(true);

  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-40" />
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
              <div className="relative">
                <ComposerMenu open={open}>
                  {MODELS.map((entry) => (
                    <ComposerModelItem
                      key={entry.name}
                      entry={entry}
                      selected={entry.name === model}
                      onClick={() => {
                        setModel(entry.name);
                        setOpen(false);
                      }}
                    />
                  ))}
                </ComposerMenu>
                <ComposerModelTrigger
                  model={model}
                  open={open}
                  onClick={() => setOpen((current) => !current)}
                />
              </div>
            </ComposerActions>
            <ComposerActions>
              <ComposerSend
                streaming={false}
                idle={value.length === 0}
                onClick={() => setValue("")}
              />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}
