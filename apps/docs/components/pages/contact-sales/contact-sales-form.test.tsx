// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { submitted } = vi.hoisted(() => ({
  submitted: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal()),
  analytics: { contactSales: { submitted } },
}));

import { ContactSalesForm } from "./contact-sales-form";

const fetchMock = vi.fn(() => Promise.resolve(Response.json({ ok: true })));
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  cleanup();
  submitted.mockClear();
  fetchMock.mockClear();
  fetchMock.mockImplementation(() =>
    Promise.resolve(Response.json({ ok: true })),
  );
});

const pickSize = async (size: string) => {
  fireEvent.click(screen.getByLabelText("Company size"));
  const option = await screen.findByRole("option", { name: size });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
  await waitFor(() =>
    expect(screen.getByLabelText("Company size").textContent).toContain(size),
  );
};

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillText = () => {
  type("First name", "Ada");
  type("Last name", "Lovelace");
  type("Work email", "ada@acme.dev");
  type("Company", "Acme");
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Contact sales" }));

describe("ContactSalesForm", () => {
  it("shows an error on each missing required field and does not navigate", () => {
    const navigate = vi.fn();
    render(<ContactSalesForm navigate={navigate} />);
    submit();

    expect(screen.getByText("Enter your first name.")).toBeTruthy();
    expect(screen.getByText("Enter your last name.")).toBeTruthy();
    expect(screen.getByText("Enter your work email.")).toBeTruthy();
    expect(screen.getByText("Enter your company name.")).toBeTruthy();
    expect(screen.getByText("Choose a company size.")).toBeTruthy();
    expect(
      screen.getByLabelText("First name").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("First name"));
    expect(navigate).not.toHaveBeenCalled();
    expect(submitted).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a field's error once it is fixed", () => {
    render(<ContactSalesForm navigate={vi.fn()} />);
    submit();
    type("First name", "Ada");
    expect(screen.queryByText("Enter your first name.")).toBeNull();
  });

  it("hints at a work email for a free mail address without blocking", () => {
    render(<ContactSalesForm navigate={vi.fn()} />);
    type("Work email", "ada@gmail.com");
    expect(
      screen.getByText(/A work email helps us find your team/),
    ).toBeTruthy();
    type("Work email", "ada@acme.dev");
    expect(
      screen.queryByText(/A work email helps us find your team/),
    ).toBeNull();
  });

  it("opens the prefilled cal.com booking once the form is valid", async () => {
    const navigate = vi.fn();
    render(<ContactSalesForm navigate={navigate} />);
    fillText();
    type(/^What are you building\?/, "A support agent.");

    fireEvent.click(screen.getByLabelText("Company size"));
    const option = await screen.findByRole("option", { name: "51-200" });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
    await waitFor(() =>
      expect(screen.getByLabelText("Company size").textContent).toContain(
        "51-200",
      ),
    );

    submit();

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const url = new URL(navigate.mock.calls[0]![0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://cal.com/simon-farshid/assistant-ui",
    );
    expect(url.searchParams.get("name")).toBe("Ada Lovelace");
    expect(url.searchParams.get("email")).toBe("ada@acme.dev");
    expect(url.searchParams.get("notes")).toBe(
      "Company: Acme\nCompany size: 51-200\n\nWhat are you building?\nA support agent.",
    );
    const button = screen.getByRole("button", { name: "Opening cal.com" });
    expect(button.hasAttribute("disabled")).toBe(true);
    const restored = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(restored, "persisted", { value: true });
    act(() => {
      window.dispatchEvent(restored);
    });
    expect(
      screen
        .getByRole("button", { name: "Contact sales" })
        .hasAttribute("disabled"),
    ).toBe(false);

    expect(submitted).toHaveBeenCalledWith({
      company_size: "51-200",
      role: "unspecified",
      referral: "unspecified",
      personal_email: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(endpoint).toBe("/api/contact-sales");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@acme.dev",
      company: "Acme",
      companySize: "51-200",
      role: "",
      building: "A support agent.",
      referral: "",
      website: "",
      pageUrl: window.location.href,
    });
  });

  it("still opens cal.com when the email request fails", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    const navigate = vi.fn();
    render(<ContactSalesForm navigate={navigate} />);
    fillText();
    await pickSize("1-10");
    submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  });

  it("opens cal.com after 2.5s when the email request hangs", async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    const navigate = vi.fn();
    render(<ContactSalesForm navigate={navigate} />);
    fillText();
    await pickSize("1-10");

    vi.useFakeTimers();
    try {
      submit();
      await vi.advanceTimersByTimeAsync(2_000);
      expect(navigate).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(500);
      expect(navigate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps text fields at the length the server accepts", () => {
    render(<ContactSalesForm navigate={vi.fn()} />);
    expect(screen.getByLabelText("Company").getAttribute("maxlength")).toBe(
      "200",
    );
    expect(
      screen
        .getByLabelText(/^What are you building\?/)
        .getAttribute("maxlength"),
    ).toBe("1000");
  });

  it("sends the hidden honeypot value so the server can drop bots", async () => {
    const navigate = vi.fn();
    const { container } = render(<ContactSalesForm navigate={navigate} />);
    fillText();
    const trap = container.querySelector<HTMLInputElement>(
      'input[name="website"]',
    )!;
    expect(trap.tabIndex).toBe(-1);
    trap.value = "https://spam.test";
    await pickSize("1-10");
    submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(init.body as string).website).toBe("https://spam.test");
  });
});
