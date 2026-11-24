"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorRoot,
  ModelSelectorSearch,
  ModelSelectorTrigger,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector";
import type { ImageModel } from "../api/models/route";
import data from "../data.json";
import { MODEL, PROVIDER, useOptions } from "./state";

/* -------------------------------------------------------------------------- */
/* Model picker: every image model Modelpedia lists, grouped by provider      */
/* -------------------------------------------------------------------------- */

/* The block's own model, which the picker holds until the list arrives, and alone if it does not. */
const OWN: readonly ImageModel[] = [
  { id: MODEL, name: data.model, provider: "OpenAI" },
];

let listed: Promise<readonly ImageModel[]> | undefined;

const readModels = () =>
  (listed ??= fetch("/blocks/demos/images/api/models")
    .then((response) =>
      response.ok ? response.json() : Promise.reject(response),
    )
    .then((body: { models: ImageModel[] }) =>
      body.models.some((model) => model.id === MODEL) ? body.models : OWN,
    )
    .catch(() => OWN));

function useImageModels() {
  const [models, setModels] = useState(OWN);

  useEffect(() => {
    let current = true;
    readModels().then((next) => {
      if (current) setModels(next);
    });
    return () => {
      current = false;
    };
  }, []);

  return models;
}

/* The route holds a key for one provider, so only that provider's models can be picked. */
const canRun = (model: ImageModel) => model.id.startsWith(`${PROVIDER}/`);

type Group = { provider: string; runs: boolean; models: ModelOption[] };

export function ModelPicker() {
  const { model, setModel } = useOptions();
  const models = useImageModels();

  const { options, groups } = useMemo(() => {
    const byProvider = new Map<string, Group>();
    const options = models.map((entry) => {
      const runs = canRun(entry);
      const option: ModelOption = {
        id: entry.id,
        name: entry.name,
        keywords: [entry.provider],
        ...(!runs && { disabled: true }),
      };
      const group = byProvider.get(entry.provider) ?? {
        provider: entry.provider,
        runs,
        models: [],
      };
      group.models.push(option);
      byProvider.set(entry.provider, group);
      return option;
    });
    const groups = [...byProvider.values()].sort(
      (a, b) =>
        Number(b.runs) - Number(a.runs) || a.provider.localeCompare(b.provider),
    );
    for (const group of groups)
      group.models.sort((a, b) => a.name.localeCompare(b.name));
    return { options, groups };
  }, [models]);

  return (
    <ModelSelectorRoot models={options} value={model} onValueChange={setModel}>
      <ModelSelectorTrigger
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground h-9 max-w-52 shrink-0 gap-1 rounded-full px-3 text-sm max-sm:ms-auto"
      />
      <ModelSelectorContent side="top" align="end" className="w-80">
        <ModelSelectorSearch placeholder="Search image models" />
        <ModelSelectorList className="max-h-80">
          <ModelSelectorEmpty />
          {groups.map((group) => (
            <ModelSelectorGroup
              key={group.provider}
              heading={
                group.runs
                  ? group.provider
                  : `${group.provider} · needs its own key`
              }
            >
              {group.models.map((option) => (
                <ModelSelectorItem key={option.id} model={option} />
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}
