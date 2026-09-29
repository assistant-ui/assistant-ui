// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import type { CloudProjectsState } from "@/lib/cloud-projects-client";
import type { SessionState } from "@/lib/session";
import { WizardHost } from "./test/wizard-host";

const mocks = vi.hoisted(() => ({
  session: { status: "loading" } as SessionState,
  projects: { status: "unavailable" } as CloudProjectsState,
  enabled: [] as boolean[],
}));

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  useSession: () => mocks.session,
}));

vi.mock("@/lib/cloud-projects-client", () => ({
  useCloudProjects: (enabled: boolean) => {
    mocks.enabled.push(enabled);
    return mocks.projects;
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/components/setup",
}));

import {
  CloudProjectInputCard,
  asksForCloudProject,
  frontendUrlOf,
} from "./cloud-project-input-card";

afterEach(() => {
  cleanup();
  mocks.enabled = [];
});

const input: Checkout.Input = {
  id: "q1",
  kind: "text",
  phase: "installing",
  prompt: "Which Assistant Cloud project should this app use?",
  optional: false,
  status: "open",
  createdAt: 1,
};

const user = { name: "Ada", email: "ada@test", image: null };

const setup = () => {
  const answer = vi.fn().mockResolvedValue(undefined);
  render(
    <WizardHost>
      <CloudProjectInputCard
        input={input}
        checkout={
          {
            commands: { "checkout/answer": answer },
          } as unknown as CheckoutContextValue
        }
      />
    </WizardHost>,
  );
  return answer;
};

const field = () =>
  screen.getByRole<HTMLInputElement>("textbox", { name: "Frontend API URL" });
const next = () => screen.getByRole("button", { name: "Next" });

describe("CloudProjectInputCard", () => {
  it("offers sign-in back to this page and takes a pasted URL meanwhile", async () => {
    mocks.session = { status: "anonymous" };
    const answer = setup();
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/api/auth/login?redirect=%2Fcomponents%2Fsetup");
    expect(mocks.enabled).not.toContain(true);
    expect(next()).toHaveProperty("disabled", true);
    fireEvent.change(field(), {
      target: { value: " https://proj-abc.assistant-api.com/ " },
    });
    expect(next()).toHaveProperty("disabled", false);
    fireEvent.click(next());
    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith({
        inputId: "q1",
        answer: "https://proj-abc.assistant-api.com",
      }),
    );
  });

  it("shows only the field when the deployment has no sign-in", () => {
    mocks.session = { status: "disabled" };
    setup();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(field()).toBeTruthy();
    expect(mocks.enabled).not.toContain(true);
  });

  it("lists the signed-in visitor's projects and answers with the chosen one's URL", async () => {
    mocks.session = { status: "signed-in", cloudHistory: false, user };
    mocks.projects = {
      status: "ready",
      projects: [
        {
          id: "proj_a",
          name: "Support desk",
          organization: "Acme",
          frontendUrl: "https://proj-a.assistant-api.com",
        },
        {
          id: "proj_b",
          name: "Docs bot",
          organization: "Beta",
          frontendUrl: "https://proj-b.assistant-api.com",
        },
      ],
    };
    const answer = setup();
    expect(mocks.enabled).toContain(true);
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(
      screen.getByRole("radio", { name: /Support desk/ }).closest("label")!
        .textContent,
    ).toContain("Acme");
    expect(
      screen.queryByRole("textbox", { name: "Frontend API URL" }),
    ).toBeNull();
    expect(next()).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("radio", { name: /Docs bot/ }));
    expect(next()).toHaveProperty("disabled", false);
    fireEvent.click(next());
    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith({
        inputId: "q1",
        answer: "https://proj-b.assistant-api.com",
      }),
    );
  });

  it("reveals the field for another project", () => {
    mocks.session = { status: "signed-in", cloudHistory: false, user };
    mocks.projects = {
      status: "ready",
      projects: [
        {
          id: "proj_a",
          name: "Support desk",
          organization: "Acme",
          frontendUrl: "https://proj-a.assistant-api.com",
        },
      ],
    };
    setup();
    expect(
      screen.getByRole("radio", { name: /Support desk/ }).closest("label")!
        .textContent,
    ).not.toContain("Acme");
    fireEvent.click(screen.getByRole("radio", { name: /Another project/ }));
    fireEvent.change(field(), { target: { value: "http://insecure.test" } });
    expect(next()).toHaveProperty("disabled", true);
    fireEvent.change(field(), { target: { value: "https://own.example.com" } });
    expect(next()).toHaveProperty("disabled", false);
  });

  it("says when the account has no projects and where a URL comes from", () => {
    mocks.session = { status: "signed-in", cloudHistory: false, user };
    mocks.projects = { status: "ready", projects: [] };
    setup();
    expect(
      screen.getByText(/Your account has no projects yet/).textContent,
    ).toContain("Settings › General");
    expect(field()).toBeTruthy();
  });

  it("falls back to the field while the listing loads or fails", () => {
    mocks.session = { status: "signed-in", cloudHistory: false, user };
    mocks.projects = { status: "loading" };
    setup();
    expect(screen.getByRole("status").textContent).toContain(
      "Loading your projects",
    );
    expect(field()).toBeTruthy();
    cleanup();
    mocks.projects = { status: "unavailable" };
    setup();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(field()).toBeTruthy();
  });
});

describe("asksForCloudProject", () => {
  it.each([
    "Which Assistant Cloud project should this app use?",
    "Paste the Frontend API URL from Settings › General.",
    "Enter your project's URL, like https://proj-x.assistant-api.com",
  ])("recognises %s", (prompt) => {
    expect(asksForCloudProject({ ...input, prompt })).toBe(true);
  });

  it("leaves other questions alone", () => {
    expect(asksForCloudProject({ ...input, prompt: "Which port?" })).toBe(
      false,
    );
    expect(asksForCloudProject({ ...input, kind: "choice" })).toBe(false);
  });
});

describe("frontendUrlOf", () => {
  it("keeps the origin of an https URL and rejects anything else", () => {
    expect(frontendUrlOf(" https://proj-a.assistant-api.com/ ")).toBe(
      "https://proj-a.assistant-api.com",
    );
    expect(frontendUrlOf("http://proj-a.assistant-api.com")).toBeUndefined();
    expect(frontendUrlOf("proj-a.assistant-api.com")).toBeUndefined();
    expect(frontendUrlOf("")).toBeUndefined();
  });
});
