export namespace Checkout {
  export type StepStatus =
    | "pending"
    | "active"
    | "done"
    | "skipped"
    | "blocked";

  export type Step = {
    id: string;
    title: string;
    detail?: string;
    status: StepStatus;
    note?: string;
    addedBy: "catalog" | "agent";
  };

  export type Product = {
    slug: string;
    name: string;
    guide?: string;
    steps: Step[];
  };

  export type InputStatus = "open" | "answered" | "dismissed";

  export type Input = {
    id: string;
    kind: "text";
    prompt: string;
    placeholder?: string;
    optional: boolean;
    status: InputStatus;
    answer?: string;
    stepId?: string;
    createdAt: number;
  };

  export type LogEntry = {
    id: string;
    at: number;
    text: string;
  };

  export type Status = "waiting" | "running" | "done" | "cancelled";

  export type State = {
    version: 1;
    status: Status;
    createdAt: number | null;
    products: Product[];
    agent: { lastSeenAt: number | null; cwd: string | null };
    inputs: Input[];
    log: LogEntry[];
  };

  export type StepSeed = { id: string; title: string; detail?: string };
  export type ProductSeed = {
    slug: string;
    name: string;
    guide?: string;
    steps: StepSeed[];
  };
  export type InputSeed = {
    prompt: string;
    placeholder?: string;
    optional?: boolean;
  };

  export type Commands = {
    "checkout/create": (params: {
      products: ProductSeed[];
      inputs?: InputSeed[];
    }) => void;
    "checkout/answer": (params: { inputId: string; answer: string }) => void;
    "checkout/dismiss": (params: { inputId: string }) => void;
    "checkout/cancel": () => void;
    "agent/hello": (params: { cwd?: string }) => void;
    "agent/heartbeat": () => void;
    "agent/step": (params: {
      stepId: string;
      status: StepStatus;
      note?: string;
    }) => void;
    "agent/add-step": (params: {
      product: string;
      title: string;
      detail?: string;
    }) => { stepId: string };
    "agent/ask": (params: InputSeed & { stepId?: string }) => {
      inputId: string;
    };
    "agent/log": (params: { text: string }) => void;
    "agent/done": () => void;
  };

  export type RejectionReason =
    | "already-created"
    | "not-created"
    | "closed"
    | "unknown-step"
    | "unknown-product"
    | "unknown-input"
    | "input-closed";
}

export const AGENT_PRESENCE_MS = 45_000;
export const AGENT_HEARTBEAT_MS = 15_000;

export const initialCheckoutState = (): Checkout.State => ({
  version: 1,
  status: "waiting",
  createdAt: null,
  products: [],
  agent: { lastSeenAt: null, cwd: null },
  inputs: [],
  log: [],
});

export const isAgentPresent = (state: Checkout.State, now = Date.now()) =>
  state.agent.lastSeenAt !== null &&
  now - state.agent.lastSeenAt < AGENT_PRESENCE_MS;

export const openInputs = (state: Checkout.State) =>
  state.inputs.filter((input) => input.status === "open");

export const stepProgress = (state: Checkout.State) => {
  const steps = state.products.flatMap((product) => product.steps);
  return {
    total: steps.length,
    done: steps.filter(
      (step) => step.status === "done" || step.status === "skipped",
    ).length,
  };
};
