import { describe, it, expect } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
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

describe("api bindings unrelated to useAssistantApi", () => {
  it("does not rename a destructured api from another source", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  return api.thread();
}

function loadData() {
  const { api } = createClient();
  return api.fetchStuff();
}
`;

    const output = applyTransform(input);
    expect(output).toContain("const { api } = createClient()");
    expect(output).toContain("api.fetchStuff()");
    expect(output).toContain("const aui = useAui()");
  });

  it("does not rename a function parameter named api", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  return api.thread();
}

function callRemote(api: RemoteApi) {
  return api.send();
}
`;

    const output = applyTransform(input);
    expect(output).toContain("function callRemote(api: RemoteApi)");
    expect(output).toContain("return api.send()");
  });

  it("expands shorthand object properties instead of renaming the key", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  return register({ api });
}
`;

    const output = applyTransform(input);
    expect(output).toContain("register({ api: aui })");
  });
});

describe("JSX and export positions", () => {
  it("does not rename JSX member properties or intrinsic tags", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  return (
    <div>
      <config.api />
      <api />
    </div>
  );
}
`;

    const output = applyTransform(input);
    expect(output).toContain("<config.api />");
    expect(output).toContain("<api />");
    expect(output).toContain("void aui.thread()");
  });

  it("preserves the public name of a re-exported api", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

const api = useAssistantApi();

export { api };
`;

    const output = applyTransform(input);
    expect(output).toContain("export { aui as api }");
    expect(output).toContain("const aui = useAui()");
  });
});

describe("aliased and source-bearing exports", () => {
  it("preserves aliased public names", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

const api = useAssistantApi();

export { api as default };
export { api as clientApi };
`;

    const output = applyTransform(input);
    expect(output).toContain("export { aui as default }");
    expect(output).toContain("export { aui as clientApi }");
  });

  it("leaves source-bearing re-exports untouched", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

const api = useAssistantApi();
void api.thread();

export { api } from "./other-module";
`;

    const output = applyTransform(input);
    expect(output).toContain('export { api } from "./other-module"');
    expect(output).toContain("void aui.thread()");
  });

  it("leaves type-only api exports untouched", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

const api = useAssistantApi();
void api.thread();

type api = { x: number };
export type { api };
export { type api as ApiType };
`;

    const output = applyTransform(input);
    expect(output).toContain("export type { api }");
    expect(output).toContain("export { type api as ApiType }");
    expect(output).toContain("void aui.thread()");
  });
});

describe("block-scoped shadowing", () => {
  it("does not rename a block-scoped api inside the same function", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  {
    const api = createOther();
    void api.other();
  }
  if (true) {
    const { api } = createClient();
    void api.fetchStuff();
  }
  return null;
}
`;

    const output = applyTransform(input);
    expect(output).toContain("void aui.thread()");
    expect(output).toContain("const api = createOther()");
    expect(output).toContain("void api.other()");
    expect(output).toContain("const { api } = createClient()");
    expect(output).toContain("void api.fetchStuff()");
  });
});

describe("binding positions beyond plain declarations", () => {
  it("does not rename method parameters named api", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  const handlers = {
    load(api: RemoteApi) {
      return api.send();
    },
  };
  class Client {
    call(api: RemoteApi) {
      return api.send();
    }
  }
  return handlers;
}
`;

    const output = applyTransform(input);
    expect(output).toContain("load(api: RemoteApi)");
    expect(output).toContain("call(api: RemoteApi)");
    expect(output?.match(/return api\.send\(\)/g)).toHaveLength(2);
    expect(output).toContain("void aui.thread()");
  });

  it("does not rename constructor parameter properties named api", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  class Client {
    constructor(public api: RemoteApi) {
      return api.send();
    }
  }
  return Client;
}
`;

    const output = applyTransform(input);
    expect(output).toContain("constructor(public api: RemoteApi)");
    expect(output).toContain("return api.send()");
    expect(output).toContain("void aui.thread()");
  });

  it("treats function and class declarations named api as shadows", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

const api = useAssistantApi();
void api.thread();

function outer() {
  function api() {}
  return api();
}

function other() {
  class api {}
  return new api();
}
`;

    const output = applyTransform(input);
    expect(output).toContain("void aui.thread()");
    expect(output).toContain("function api() {}");
    expect(output).toContain("return api()");
    expect(output).toContain("class api {}");
    expect(output).toContain("new api()");
  });

  it("recognizes for-initializer and switch-case declarations", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  for (let api = start(); api.more(); api = api.next()) {
    use(api);
  }
  switch (kind) {
    case "a": {
      const api = other();
      return api.load();
    }
  }
}
`;

    const output = applyTransform(input);
    expect(output).toContain("void aui.thread()");
    expect(output).toContain(
      "for (let api = start(); api.more(); api = api.next())",
    );
    expect(output).toContain("use(api)");
    expect(output).toContain("const api = other()");
    expect(output).toContain("return api.load()");
  });

  it("handles export const api declarations", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

export const api = useAssistantApi();

export function helper() {
  return api.thread();
}
`;

    const output = applyTransform(input);
    expect(output).toContain("export const aui = useAui()");
    expect(output).toContain("return aui.thread()");
  });
});

describe("keys and type-only declarations", () => {
  it("does not rename method or class-member keys named api", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  const handlers = {
    api() {
      return 1;
    },
  };
  class Client {
    api = 1;
    api2() {
      return this.api;
    }
  }
  return { handlers, Client };
}
`;

    const output = applyTransform(input);
    expect(output).toContain("api() {");
    expect(output).toContain("api = 1;");
    expect(output).toContain("return this.api");
    expect(output).toContain("void aui.thread()");
  });

  it("does not treat type-only declarations as value shadows", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  type api2 = string;
  {
    type api = { x: number };
    interface apiShape {}
    void api.thread();
  }
  return null;
}
`;

    const output = applyTransform(input);
    expect(output).toContain("void aui.thread()");
    expect(output).toContain("type api = { x: number }");
  });
});

describe("named expressions", () => {
  it("does not rename the self-reference of a named function expression", () => {
    const input = `
import { useAssistantApi } from "@assistant-ui/react";

function MyComponent() {
  const api = useAssistantApi();
  void api.thread();
  const run = function api() {
    return api;
  };
  return run;
}
`;

    const output = applyTransform(input);
    expect(output).toContain("function api() {");
    expect(output).toContain("return api;");
    expect(output).toContain("void aui.thread()");
  });
});
