import { describe, it, expect } from "vitest";
import jscodeshift, { API } from "jscodeshift";
import transform from "../assistant-api-to-aui";

const j = jscodeshift.withParser("tsx");

function applyTransform(source: string): string | null {
  const fileInfo = {
    path: "test.tsx",
    source,
  };

  const api: API = {
    jscodeshift: j,
    j,
    stats: () => {},
    report: () => {},
  };

  return transform(fileInfo, api, {});
}

describe("assistant-api-to-aui", () => {
  it("should rename useAssistantApi to useAui", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  return <div />;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();
  return <div />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should rename useAssistantState to useAuiState", () => {
    const input = `
import { useAssistantState } from "@assistant-ui/react";

function MyComponent() {
  const isRunning = useAssistantState((s) => s.thread.isRunning);
  return <div />;
}
`;

    const expected = `
import { useAuiState } from "@assistant-ui/react";

function MyComponent() {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  return <div />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should rename useAssistantEvent to useAuiEvent", () => {
    const input = `
import { useAssistantEvent } from "@assistant-ui/react";

function MyComponent() {
  useAssistantEvent("thread.started", () => console.log("started"));
  return <div />;
}
`;

    const expected = `
import { useAuiEvent } from "@assistant-ui/react";

function MyComponent() {
  useAuiEvent("thread.started", () => console.log("started"));
  return <div />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should rename api variable and all its references", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();

  const handleClick = () => {
    api.thread().append({ role: "user", content: [{ type: "text", text: "Hello" }] });
  };

  return <button onClick={handleClick}>Send</button>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();

  const handleClick = () => {
    aui.thread().append({ role: "user", content: [{ type: "text", text: "Hello" }] });
  };

  return <button onClick={handleClick}>Send</button>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should handle multiple hooks in the same file", () => {
    const input = `
import { useAssistantApi, useAssistantState } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  const isRunning = useAssistantState((s) => s.thread.isRunning);

  const handleClick = () => {
    if (!isRunning) {
      api.composer().send();
    }
  };

  return <button onClick={handleClick}>Send</button>;
}
`;

    const expected = `
import { useAui, useAuiState } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();
  const isRunning = useAuiState((s) => s.thread.isRunning);

  const handleClick = () => {
    if (!isRunning) {
      aui.composer().send();
    }
  };

  return <button onClick={handleClick}>Send</button>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should not rename api variable if it's not from useAui", () => {
    const input = `
function MyComponent() {
  const api = someOtherFunction();
  return <div>{api.data}</div>;
}
`;

    const output = applyTransform(input);
    expect(output).toBe(null); // No changes
  });

  it("should not rename api if it's a property name", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  const config = { api: true };
  return <div />;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();
  const config = { api: true };
  return <div />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should preserve custom variable names that aren't 'api'", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const client = useAssistantApi();
  client.thread().append({ role: "user", content: [{ type: "text", text: "Hello" }] });
  return <div />;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent() {
  const client = useAui();
  client.thread().append({ role: "user", content: [{ type: "text", text: "Hello" }] });
  return <div />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should handle arrow functions", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

const MyComponent = () => {
  const api = useAssistantApi();

  return <button onClick={() => api.composer().send()}>Send</button>;
};
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

const MyComponent = () => {
  const aui = useAui();

  return <button onClick={() => aui.composer().send()}>Send</button>;
};
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should handle nested function calls", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();

  useEffect(() => {
    const state = api.thread().getState();
    console.log(state);
  }, [api]);

  return <div />;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();

  useEffect(() => {
    const state = aui.thread().getState();
    console.log(state);
  }, [aui]);

  return <div />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should NOT rename api from other libraries", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";
import { useApiClient } from "some-other-library";

function MyComponent() {
  const aui = useAssistantApi();
  const api = useApiClient(); // This should NOT be renamed

  return <div>{api.getData()}</div>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";
import { useApiClient } from "some-other-library";

function MyComponent() {
  const aui = useAui();
  const api = useApiClient(); // This should NOT be renamed

  return <div>{api.getData()}</div>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should NOT rename api from regular functions", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function fetchApi() {
  return { get: () => {} };
}

function MyComponent() {
  const aui = useAssistantApi();
  const api = fetchApi(); // This should NOT be renamed

  return <button onClick={() => api.get()}>Fetch</button>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function fetchApi() {
  return { get: () => {} };
}

function MyComponent() {
  const aui = useAui();
  const api = fetchApi(); // This should NOT be renamed

  return <button onClick={() => api.get()}>Fetch</button>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should handle multiple components with different api sources", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function Component1() {
  const api = useAssistantApi();
  return <div>{api.thread()}</div>;
}

function Component2() {
  const api = fetch('/api'); // This should NOT be renamed
  return <div>{api}</div>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function Component1() {
  const aui = useAui();
  return <div>{aui.thread()}</div>;
}

function Component2() {
  const api = fetch('/api'); // This should NOT be renamed
  return <div>{api}</div>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should NOT rename api in object destructuring", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent({ api: propApi }) {
  const aui = useAssistantApi();

  return <div>{propApi.data}</div>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent({ api: propApi }) {
  const aui = useAui();

  return <div>{propApi.data}</div>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should handle scope correctly with nested functions", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function OuterComponent() {
  const api = useAssistantApi();

  function innerFunction() {
    const api = someOtherFunction(); // Different api, should NOT be renamed
    return api.data;
  }

  return <div onClick={() => api.composer().send()}>Send</div>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function OuterComponent() {
  const aui = useAui();

  function innerFunction() {
    const api = someOtherFunction(); // Different api, should NOT be renamed
    return api.data;
  }

  return <div onClick={() => aui.composer().send()}>Send</div>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should NOT rename api that shadows useAui api", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();

  const processData = () => {
    const api = { custom: true }; // Shadows outer api, should NOT be renamed
    return api.custom;
  };

  return <div onClick={() => api.composer().send()}>Send</div>;
}
`;

    const expected = `
import { useAui } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();

  const processData = () => {
    const api = { custom: true }; // Shadows outer api, should NOT be renamed
    return api.custom;
  };

  return <div onClick={() => aui.composer().send()}>Send</div>;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should rename AssistantIf to AuiIf in imports and JSX", () => {
    const input = `
import { AssistantIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AssistantIf condition={(s) => s.thread.isRunning}>
      <div>Running...</div>
    </AssistantIf>
  );
}
`;

    const expected = `
import { AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return (
    <AuiIf condition={(s) => s.thread.isRunning}>
      <div>Running...</div>
    </AuiIf>
  );
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should rename AssistantProvider to AuiProvider in imports and JSX", () => {
    const input = `
import { AssistantProvider } from "@assistant-ui/react";

function App() {
  return (
    <AssistantProvider>
      <div>My App</div>
    </AssistantProvider>
  );
}
`;

    const expected = `
import { AuiProvider } from "@assistant-ui/react";

function App() {
  return (
    <AuiProvider>
      <div>My App</div>
    </AuiProvider>
  );
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should rename both components and hooks in the same file", () => {
    const input = `
import { useAssistantApi, AssistantIf, AssistantProvider } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();

  return (
    <AssistantProvider>
      <AssistantIf condition={(s) => s.thread.isRunning}>
        <button onClick={() => api.composer().send()}>Send</button>
      </AssistantIf>
    </AssistantProvider>
  );
}
`;

    const expected = `
import { useAui, AuiIf, AuiProvider } from "@assistant-ui/react";

function MyComponent() {
  const aui = useAui();

  return (
    <AuiProvider>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <button onClick={() => aui.composer().send()}>Send</button>
      </AuiIf>
    </AuiProvider>
  );
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });

  it("should handle self-closing JSX components", () => {
    const input = `
import { AssistantIf } from "@assistant-ui/react";

function MyComponent() {
  return <AssistantIf condition={(s) => s.thread.isRunning} />;
}
`;

    const expected = `
import { AuiIf } from "@assistant-ui/react";

function MyComponent() {
  return <AuiIf condition={(s) => s.thread.isRunning} />;
}
`;

    const output = applyTransform(input);
    expect(output?.trim()).toBe(expected.trim());
  });
});
