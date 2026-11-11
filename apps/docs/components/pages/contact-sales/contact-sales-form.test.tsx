// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { submitted } = vi.hoisted(() => ({ submitted: vi.fn() }));

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal()),
  analytics: { contactSales: { submitted } },
}));

import { ContactSalesForm } from "./contact-sales-form";

afterEach(() => {
  cleanup();
  submitted.mockReset();
});

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillText = () => {
  type("First name", "Ada");
  type("Last name", "Lovelace");
  type("Work email", "ada@acme.dev");
  type("Company", "Acme");
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue to booking" }));

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
      screen.getByText(/Use your work email if you have one/),
    ).toBeTruthy();
    type("Work email", "ada@acme.dev");
    expect(
      screen.queryByText(/Use your work email if you have one/),
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

    expect(navigate).toHaveBeenCalledTimes(1);
    const url = new URL(navigate.mock.calls[0]![0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://cal.com/simon-farshid/assistant-ui",
    );
    expect(url.searchParams.get("name")).toBe("Ada Lovelace");
    expect(url.searchParams.get("email")).toBe("ada@acme.dev");
    expect(url.searchParams.get("notes")).toBe(
      "Company: Acme\nCompany size: 51-200\n\nWhat are you building?\nA support agent.",
    );
    expect(submitted).toHaveBeenCalledWith({
      company_size: "51-200",
      role: "unspecified",
      referral: "unspecified",
      personal_email: false,
    });
  });
});
