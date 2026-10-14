/** Helpers shared by the demo pages and the headless verification runs. */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const params = new URLSearchParams(location.search);

export const demoState = {
  auto: params.has("auto"),
  dark: params.has("dark"),
  done: false,
  steps: [] as string[],
  prompts: [] as string[],
  log: [] as string[],
  report: {} as Record<string, unknown>,
};
(window as unknown as { __demo: typeof demoState }).__demo = demoState;

export const applyDemoTheme = () => {
  if (demoState.dark) document.documentElement.classList.add("dark");
};

/** Saves a file to .screenshots/ through the dev server. */
export const save = async (name: string, body: string) => {
  await fetch(`/__save?name=${encodeURIComponent(name)}`, {
    method: "POST",
    body,
  });
};
