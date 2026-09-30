import {
  useAssistantDataUI,
  type AssistantDataUIProps,
  type Toolkit,
} from "@assistant-ui/react";
import fixtureUIModules from "virtual:fixture-uis";

const duplicates = (names: string[]) =>
  names.filter((name, i) => names.indexOf(name) !== i);

/** The tool UIs every file in `webview/fixture-ui/` registers, merged. */
export const FIXTURE_TOOLKIT: Toolkit = Object.assign(
  {},
  ...fixtureUIModules.map(({ value }) => value.tools ?? {}),
);

const FIXTURE_DATA_UIS: readonly AssistantDataUIProps[] =
  fixtureUIModules.flatMap(({ value }) => value.dataUIs ?? []);

/** Names registered by more than one file. */
export const fixtureUIConflicts = () => [
  ...duplicates(
    fixtureUIModules.flatMap(({ value }) => Object.keys(value.tools ?? {})),
  ).map((name) => `tool UI ${name} is registered twice`),
  ...duplicates(FIXTURE_DATA_UIS.map((ui) => ui.name)).map(
    (name) => `data UI ${name} is registered twice`,
  ),
];

function DataUI({ ui }: { ui: AssistantDataUIProps }) {
  useAssistantDataUI(ui);
  return null;
}

/** Registers every fixture data UI; render it inside the runtime provider. */
export function FixtureDataUIs() {
  return FIXTURE_DATA_UIS.map((ui) => <DataUI key={ui.name} ui={ui} />);
}
