import type { Component } from "vue";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vitest";

const elementContext = vi.hoisted(() => ({
  value: { id: "main", element: { on: {} }, bindings: {} },
}));

vi.mock("generative-frame/spec/vue", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("generative-frame/spec/vue")>();
  return {
    ...original,
    useSpecElement: () => elementContext.value as never,
  };
});

import { alertVocabulary } from "./alert";
import { interactiveVocabulary } from "./interactive";
import { layoutVocabulary } from "./layout";

const render = (component: Component, props: Record<string, unknown>) =>
  renderToString(createSSRApp({ render: () => h(component, props) }));

describe("Vue numeric text content", () => {
  it("renders zero in Alert title and description", async () => {
    const html = await render(alertVocabulary.Alert.component, {
      title: 0,
      description: 0,
    });
    expect(html).toContain(
      '<header data-aui="alert-title">0</header><p data-aui="alert-desc">0</p>',
    );
  });

  it("renders zero in a Card title", async () => {
    const html = await render(layoutVocabulary.Card.component, { title: 0 });
    expect(html).toContain('<header data-aui="card-title">0</header>');
  });

  it("renders zero in a Select placeholder", async () => {
    const html = await render(interactiveVocabulary.Select.component, {
      options: [{ label: "A", value: "a" }],
      placeholder: 0,
    });
    expect(html).toContain("selected>0</option>");
  });
});
