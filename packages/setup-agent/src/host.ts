import { resource } from "@assistant-ui/tap";
import {
  StatewireReject,
  getStateHost,
  useStatewireCommands,
  useStatewireState,
} from "statewire/host";
import {
  classifyChoiceAnswer,
  currentPlan,
  initialCheckoutState,
  isAgentPresent,
  isClosed,
  isValidModelAnswer,
  parsePreviewUrl,
} from "./protocol";
import type { Checkout } from "./protocol";

const reject = (reason: Checkout.RejectionReason, message: string) =>
  new StatewireReject(message, { payload: { reason } });

const useCheckoutHost = (restored: unknown) => {
  const [state] = useStatewireState<Checkout.State>(() => {
    const initial = initialCheckoutState();
    if (restored === undefined) return initial;
    const snapshot = restored as Partial<Checkout.State>;
    if (snapshot.version !== 2) return initial;
    return {
      ...initial,
      ...snapshot,
      agent: { ...initial.agent, ...snapshot.agent },
    };
  });

  const requireOpen = () => {
    if (state.createdAt === null) {
      throw reject("not-created", "the setup has not been created yet");
    }
    if (isClosed(state)) {
      throw reject("closed", `the setup is ${state.status}`);
    }
  };

  const requireStarted = () => {
    requireOpen();
    if (state.status === "waiting") {
      throw reject(
        "planning-not-started",
        'ask the user to return to their browser and click "Begin plan"; wait with "wait start"',
      );
    }
  };

  const requireInstalling = () => {
    requireOpen();
    if (state.status !== "installing") {
      throw reject(
        "plan-required",
        "steps run once the user has approved a plan; submit one with plan",
      );
    }
  };

  const findStep = (stepId: string) => {
    const step = state.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw reject("unknown-step", `no step "${stepId}"`);
    return step;
  };

  const findInput = (inputId: string) => {
    const input = state.inputs.find((candidate) => candidate.id === inputId);
    if (!input) throw reject("unknown-input", `no input "${inputId}"`);
    if (input.status !== "open") {
      throw reject("input-closed", `input "${inputId}" is ${input.status}`);
    }
    return input;
  };

  const touchAgent = () => {
    state.agent.lastSeenAt = Date.now();
    state.agent.connected = true;
  };

  const ask = (seed: Checkout.InputSeed & { stepId?: string }) => {
    const kind = seed.kind ?? "text";
    if (kind === "product") {
      if (!seed.product) {
        throw reject("invalid-input", "a product input names a product");
      }
      if (state.products.some((product) => product.slug === seed.product)) {
        throw reject(
          "invalid-input",
          `"${seed.product}" is already part of this setup`,
        );
      }
    } else if (kind !== "text" && !seed.options?.length) {
      throw reject("invalid-input", `a ${kind} input needs options`);
    }
    if (
      seed.multiple &&
      (kind !== "choice" ||
        seed.options?.some((option) => option.variants?.length))
    ) {
      throw reject(
        "invalid-input",
        "only a choice whose options have no variants accepts several answers",
      );
    }
    const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
    if (
      !unique(seed.options?.map((option) => option.id) ?? []) ||
      seed.options?.some(
        (option) =>
          !unique(option.variants?.map((variant) => variant.id) ?? []),
      )
    ) {
      throw reject("invalid-input", "option and variant ids must be unique");
    }
    if (
      seed.options?.some(
        (option) =>
          option.id.includes(":") ||
          option.variants?.some((variant) => variant.id.includes(":")),
      )
    ) {
      throw reject(
        "invalid-input",
        'option and variant ids cannot contain ":", which separates them in an answer',
      );
    }
    if (
      seed.default !== undefined &&
      !seed.options?.some((option) => option.id === seed.default)
    ) {
      throw reject(
        "invalid-input",
        `no option "${seed.default}" to default to`,
      );
    }
    if (seed.stepId !== undefined) findStep(seed.stepId);
    const id = `q${state.inputs.length + 1}`;
    const stepId =
      seed.stepId ?? state.steps.find((step) => step.status === "active")?.id;
    state.inputs.push({
      id,
      phase: state.status,
      kind,
      ...(seed.preset !== undefined && { preset: seed.preset }),
      prompt: seed.prompt,
      ...(seed.placeholder !== undefined && { placeholder: seed.placeholder }),
      ...(seed.options !== undefined && { options: seed.options }),
      ...(seed.multiple && { multiple: true }),
      ...(kind === "product" && { product: seed.product }),
      ...(seed.default !== undefined && { default: seed.default }),
      ...(seed.help !== undefined && { help: seed.help }),
      optional: seed.optional ?? false,
      status: "open",
      ...(stepId !== undefined && { stepId }),
      createdAt: Date.now(),
    });
    return { inputId: id };
  };

  const dismissOpenInputs = () => {
    for (const input of state.inputs) {
      if (input.status === "open") {
        input.status = "dismissed";
        input.answeredAt = Date.now();
      }
    }
  };

  const log = (text: string, stepId?: string) => {
    state.log.push({
      id: `l${state.log.length + 1}`,
      role: "agent",
      phase: state.status,
      at: Date.now(),
      text,
      ...(stepId !== undefined && { stepId }),
    });
  };

  const updateStep = (
    step: Checkout.Step,
    status: Checkout.StepStatus,
    note?: string,
  ) => {
    const changed = step.status !== status;
    step.status = status;
    if (note !== undefined) step.note = note;
    if (changed && (status === "done" || status === "skipped")) {
      log(
        `${status === "done" ? "Completed" : "Skipped"}: ${step.title}${step.note ? `\n\n${step.note}` : ""}`,
        step.id,
      );
    }
  };

  const commands = useStatewireCommands<Checkout.Commands>({
    "checkout/create": ({ id, products, instructions }) => {
      if (state.id === id) {
        throw reject("already-created", "the setup already exists");
      }
      const fresh = initialCheckoutState();
      if (!isAgentPresent(state)) state.agent = fresh.agent;
      state.id = id;
      state.status = fresh.status;
      delete state.completion;
      state.plans = fresh.plans;
      state.steps = fresh.steps;
      state.inputs = fresh.inputs;
      state.log = fresh.log;
      state.createdAt = Date.now();
      state.instructions = instructions?.trim() ?? "";
      state.products = products.map((product) => ({
        slug: product.slug,
        name: product.name,
        ...(product.guide !== undefined && { guide: product.guide }),
      }));
    },
    "checkout/begin-plan": () => {
      requireOpen();
      if (state.status === "waiting") state.status = "planning";
    },
    "checkout/answer": ({ inputId, answer, note }) => {
      requireOpen();
      const input = findInput(inputId);
      if (
        input.kind === "choice" &&
        classifyChoiceAnswer(input, answer) === "invalid"
      ) {
        throw reject(
          "invalid-answer",
          input.multiple
            ? `"${answer}" is not a JSON array of option ids`
            : `"${answer}" names an option without a valid variant`,
        );
      }
      if (input.kind === "model" && !isValidModelAnswer(input, answer)) {
        throw reject(
          "invalid-answer",
          "a model answer is JSON with provider and model",
        );
      }
      if (input.kind === "product") {
        throw reject(
          "invalid-answer",
          "a product input is answered with checkout/add-product",
        );
      }
      if (input.kind === "text" && answer.trim() === "") {
        throw reject("invalid-answer", "an answer cannot be empty");
      }
      input.status = "answered";
      input.answeredAt = Date.now();
      input.answer = answer;
      if (note !== undefined && note.trim() !== "") input.note = note.trim();
    },
    "checkout/add-product": ({ inputId, product }) => {
      requireOpen();
      const input = findInput(inputId);
      if (input.kind !== "product" || input.product !== product.slug) {
        throw reject(
          "invalid-answer",
          `input "${inputId}" does not propose "${product.slug}"`,
        );
      }
      if (!state.products.some((entry) => entry.slug === product.slug)) {
        state.products.push({
          slug: product.slug,
          name: product.name,
          ...(product.guide !== undefined && { guide: product.guide }),
        });
      }
      input.status = "answered";
      input.answer = "added";
      input.answeredAt = Date.now();
    },
    "checkout/message": ({ text }) => {
      requireOpen();
      if (text.trim() === "")
        throw reject("empty-message", "a message cannot be empty");
      const stepId = state.steps.find((step) => step.status === "active")?.id;
      state.log.push({
        id: `l${state.log.length + 1}`,
        role: "user",
        phase: state.status,
        ...(stepId !== undefined && { stepId }),
        at: Date.now(),
        text: text.trim(),
      });
    },
    "agent/ack": ({ messageId }) => {
      requireOpen();
      const message = state.log.find(
        (entry) => entry.id === messageId && entry.role === "user",
      );
      if (!message)
        throw reject("unknown-message", `no user message "${messageId}"`);
      message.acknowledgedAt ??= Date.now();
    },
    "checkout/dismiss": ({ inputId }) => {
      requireOpen();
      const input = findInput(inputId);
      input.status = "dismissed";
      input.answeredAt = Date.now();
    },
    "checkout/plan": (params) => {
      requireOpen();
      const plan = currentPlan(state);
      if (plan === undefined) {
        throw reject("no-plan", "the agent has not proposed a plan yet");
      }
      if (plan.status !== "proposed") {
        throw reject("plan-decided", `the plan is already ${plan.status}`);
      }
      if (params.decision === "approve") {
        plan.status = "approved";
        plan.decidedAt = Date.now();
        state.status = "installing";
        return;
      }
      if (params.feedback.trim() === "") {
        throw reject("feedback-required", "say what should change");
      }
      plan.status = "changes-requested";
      plan.decidedAt = Date.now();
      plan.feedback = params.feedback.trim();
    },
    "checkout/cancel": () => {
      if (state.createdAt === null || isClosed(state)) return;
      state.status = "cancelled";
      dismissOpenInputs();
    },
    "checkout/finish": () => {
      requireOpen();
      if (state.completion === undefined) {
        throw reject(
          "finish-not-proposed",
          "the agent has not proposed to finish yet",
        );
      }
      dismissOpenInputs();
      state.status = "done";
      log("Setup complete.");
    },
    "agent/intro": ({ kind } = {}) => {
      requireOpen();
      if (state.agent.introducedAt === null) {
        state.agent.introducedAt = Date.now();
      }
      if (kind !== undefined) state.agent.kind = kind;
    },
    "agent/hello": ({ cwd, kind } = {}) => {
      touchAgent();
      if (cwd !== undefined) state.agent.cwd = cwd;
      if (kind !== undefined) state.agent.kind = kind;
    },
    "agent/heartbeat": () => {
      touchAgent();
    },
    "agent/bye": () => {
      state.agent.connected = false;
    },
    "agent/plan": ({ markdown }) => {
      requireStarted();
      touchAgent();
      if (markdown.trim() === "") {
        throw reject("empty-plan", "the plan is empty");
      }
      if (state.status === "installing") {
        throw reject("plan-decided", "the plan is already approved");
      }
      const revision = state.plans.length + 1;
      state.plans.push({
        revision,
        markdown: markdown.trim(),
        status: "proposed",
        submittedAt: Date.now(),
      });
      return { revision };
    },
    "agent/add-step": ({ title, detail, product, active }) => {
      requireInstalling();
      if (
        product !== undefined &&
        !state.products.some((candidate) => candidate.slug === product)
      ) {
        throw reject("unknown-product", `no product "${product}"`);
      }
      const id = `s${state.steps.length + 1}`;
      state.steps.push({
        id,
        title,
        ...(detail !== undefined && { detail }),
        status: active ? "active" : "pending",
        ...(product !== undefined && { product }),
        createdAt: Date.now(),
      });
      return { stepId: id };
    },
    "agent/step": ({ stepId, status, note }) => {
      requireInstalling();
      const step = findStep(stepId);
      updateStep(step, status, note);
    },
    "agent/ask": (seed) => {
      requireStarted();
      touchAgent();
      return ask(seed);
    },
    "agent/log": ({ text }) => {
      requireOpen();
      touchAgent();
      const stepId = state.steps.find((step) => step.status === "active")?.id;
      log(text, stepId);
    },
    "agent/done": ({ summary, preview } = {}) => {
      requireInstalling();
      const previewUrl = parsePreviewUrl(preview?.trim());
      if (preview !== undefined && !previewUrl) {
        throw reject(
          "invalid-preview",
          "a preview is an http URL on localhost, such as http://localhost:3000",
        );
      }
      touchAgent();
      for (const step of state.steps) {
        if (step.status === "pending" || step.status === "active") {
          updateStep(step, "done");
        }
      }
      log(summary?.trim() || "Everything is installed.");
      state.completion = {
        proposedAt: Date.now(),
        ...(previewUrl && { preview: previewUrl.href }),
      };
    },
  });

  const source = getStateHost(state)!;
  return {
    state,
    commands,
    snapshot: source.snapshot,
    subscribe: (listener: () => void) => {
      source.setOnChange(listener);
      return () => source.setOnChange(null);
    },
  };
};

/** The setup statewire host; pass the durable object's restored snapshot. */
export const CheckoutHost = (restored?: unknown) =>
  resource(useCheckoutHost)(restored);

export type { Checkout } from "./protocol";
