import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DocumentReference } from "./document-reference";
import { field } from "./surfaces";

afterEach(cleanup);

const anchors = [
  { page: 4, quote: "first" },
  { page: 4, quote: "second" },
  { page: 9, quote: "third" },
];

/** The passages whose background says "this is the current one". */
function highlighted() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.className.includes(field));
}

function Interactive() {
  const [activePage, setActivePage] = useState(4);
  return (
    <DocumentReference
      title="doc.pdf"
      pages={14}
      anchors={anchors}
      activePage={activePage}
      onJump={setActivePage}
    />
  );
}

describe("DocumentReference", () => {
  it("marks only the passage the user picked as current", () => {
    render(<Interactive />);

    fireEvent.click(screen.getByRole("button", { name: /second/ }));

    const current = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-current") === "true");

    expect(current).toEqual([false, true, false]);
    expect(highlighted()).toEqual([
      screen.getByRole("button", { name: /second/ }),
    ]);
  });

  it("keeps the highlight on the same passage as aria-current", () => {
    render(<Interactive />);

    fireEvent.click(screen.getByRole("button", { name: /second/ }));
    fireEvent.click(screen.getByRole("button", { name: /first/ }));

    const current = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-current") === "true");

    expect(current).toHaveLength(1);
    expect(current[0]).toBe(screen.getByRole("button", { name: /first/ }));
    expect(highlighted()).toEqual(current);
  });

  it("marks the current passage in read-only mode too", () => {
    render(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors}
        activePage={9}
      />,
    );

    const current = document.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("third");
  });

  it("drops the pick when the anchors are replaced", () => {
    const { rerender } = render(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors}
        activePage={4}
        onJump={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /second/ }));

    rerender(
      <DocumentReference
        title="other.pdf"
        pages={14}
        anchors={[
          { page: 4, quote: "alpha" },
          { page: 4, quote: "beta" },
        ]}
        activePage={4}
        onJump={() => {}}
      />,
    );

    const current = document.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("alpha");
  });

  it("keeps the pick when the parent re-renders the same anchors", () => {
    const { rerender } = render(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors}
        activePage={4}
        onJump={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /second/ }));

    rerender(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors.map((anchor) => ({ ...anchor }))}
        activePage={4}
        onJump={() => {}}
      />,
    );

    const current = document.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("second");
  });

  it("drops the pick when another document reuses the same passages", () => {
    const { rerender } = render(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors}
        activePage={4}
        onJump={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /second/ }));

    rerender(
      <DocumentReference
        title="other.pdf"
        pages={14}
        anchors={anchors}
        activePage={4}
        onJump={() => {}}
      />,
    );

    const current = document.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("first");
  });

  it("ignores the pick once the card becomes read-only", () => {
    const { rerender } = render(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors}
        activePage={4}
        onJump={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /second/ }));

    rerender(
      <DocumentReference
        title="doc.pdf"
        pages={14}
        anchors={anchors}
        activePage={4}
      />,
    );

    const current = document.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("first");
  });
});
