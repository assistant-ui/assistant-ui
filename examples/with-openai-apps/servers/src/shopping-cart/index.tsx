import { useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useOpenAiGlobal } from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";
import { AvocadoIcon, BreadIcon, EggIcon, JarIcon, TomatoIcon } from "./icons";

type CartItem = {
  name: string;
  quantity: number;
  [key: string]: unknown;
};

type CartWidgetState = {
  cartId?: string;
  items?: CartItem[];
  [key: string]: unknown;
};

const createDefaultCartState = (): CartWidgetState => ({
  items: [],
});

function usePrettyJson(value: unknown): string {
  return useMemo(() => {
    if (value === undefined || value === null) {
      return "null";
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return `<<unable to render: ${error}>>`;
    }
  }, [value]);
}

function JsonPanel({ label, value }: { label: string; value: unknown }) {
  const pretty = usePrettyJson(value);

  return (
    <section className="rounded-2xl border border-black/20 bg-[#fffaf5] p-4">
      <header className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
          {label}
        </p>
      </header>
      <pre className="max-h-64 overflow-auto rounded-xl bg-white p-3 font-mono text-xs text-black/70 shadow-sm">
        {pretty}
      </pre>
    </section>
  );
}

const suggestedItems = [
  {
    name: "Eggs",
    description: "Breakfast basics",
    Icon: EggIcon,
  },
  {
    name: "Bread",
    description: "Fresh and toasty",
    Icon: BreadIcon,
  },
  {
    name: "Tomatoes",
    description: "Juicy and bright",
    Icon: TomatoIcon,
  },
  {
    name: "Avocados",
    description: "Perfectly ripe",
    Icon: AvocadoIcon,
  },
];

const iconMatchers = [
  { keywords: ["egg", "eggs"], Icon: EggIcon },
  { keywords: ["bread"], Icon: BreadIcon },
  { keywords: ["tomato", "tomatoes"], Icon: TomatoIcon },
  { keywords: ["avocado", "avocados"], Icon: AvocadoIcon },
];

function App() {
  const toolOutput = useOpenAiGlobal("toolOutput");
  const toolResponseMetadata = useOpenAiGlobal("toolResponseMetadata");
  const widgetState = useOpenAiGlobal("widgetState");
  const [cartState, setCartState] = useWidgetState<CartWidgetState>(
    createDefaultCartState
  );
  const cartItems = Array.isArray(cartState?.items) ? cartState.items : [];
  const animationStyles = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  function addItem(name: string) {
    if (!name) {
      return;
    }

    setCartState((prevState) => {
      const baseState: CartWidgetState = prevState ?? {};
      const items = Array.isArray(baseState.items)
        ? baseState.items.map((item) => ({ ...item }))
        : [];
      const idx = items.findIndex((item) => item.name === name);

      if (idx === -1) {
        items.push({ name, quantity: 1 });
      } else {
        const current = items[idx];
        items[idx] = {
          ...current,
          quantity: (current.quantity ?? 0) + 1,
        };
      }

      return { ...baseState, items };
    });
  }

  function adjustQuantity(name: string, delta: number) {
    if (!name || delta === 0) {
      return;
    }

    console.log("adjustQuantity", { name, delta });
    setCartState((prevState) => {
      const baseState: CartWidgetState = prevState ?? {};
      const items = Array.isArray(baseState.items)
        ? baseState.items.map((item) => ({ ...item }))
        : [];
      console.log("adjustQuantity:prev", baseState);

      const idx = items.findIndex((item) => item.name === name);
      if (idx === -1) {
        console.log("adjustQuantity:missing", name);
        return baseState;
      }

      const current = items[idx];
      const nextQuantity = Math.max(0, (current.quantity ?? 0) + delta);
      if (nextQuantity === 0) {
        items.splice(idx, 1);
      } else {
        items[idx] = { ...current, quantity: nextQuantity };
      }

      const nextState = { ...baseState, items };
      console.log("adjustQuantity:next", nextState);
      return nextState;
    });
  }

  const lastToolOutputRef = useRef<string>("__tool_output_unset__");

  useEffect(() => {
    // Merge deltas (toolOutput) into the latest widgetState without
    // and then update cartState. Runs whenever toolOutput changes.
    if (toolOutput == null) {
      return;
    }

    // changes to cartState triggered from UI will also trigger another global update event,
    // so we need to check if the tool event has actually changed.
    const serializedToolOutput = (() => {
      try {
        return JSON.stringify({ toolOutput, toolResponseMetadata });
      } catch (error) {
        console.warn("Unable to serialize toolOutput", error);
        return "__tool_output_error__";
      }
    })();

    if (serializedToolOutput === lastToolOutputRef.current) {
      console.log("useEffect skipped (toolOutput is actually unchanged)");
      return;
    }
    lastToolOutputRef.current = serializedToolOutput;

    // Get the items that the user wants to add to the cart from toolOutput
    const incomingItems = Array.isArray(
      (toolOutput as { items?: unknown } | null)?.items
    )
      ? (toolOutput as { items?: CartItem[] }).items ?? []
      : [];

    // Since we set `widgetSessionId` on the tool response, when the tool response returns
    // widgetState should contain the state from the previous turn of conversation
    // treat widgetState as the definitive local state, and add the new items
    const baseState = widgetState ?? cartState ?? createDefaultCartState();
    const baseItems = Array.isArray(baseState.items) ? baseState.items : [];
    const incomingCartId =
      typeof (toolOutput as { cartId?: unknown } | null)?.cartId === "string"
        ? (toolOutput as { cartId?: string }).cartId ?? undefined
        : undefined;

    const itemsByName = new Map<string, CartItem>();
    for (const item of baseItems) {
      if (item?.name) {
        itemsByName.set(item.name, item);
      }
    }
    // Add in the new items to create newState
    for (const item of incomingItems) {
      if (item?.name) {
        itemsByName.set(item.name, { ...itemsByName.get(item.name), ...item });
      }
    }

    const nextItems = Array.from(itemsByName.values());
    const nextState = {
      ...baseState,
      cartId: baseState.cartId ?? incomingCartId,
      items: nextItems,
    };

    // Update cartState with the new state that includes the new items
    // Updating cartState automatically updates window.openai.widgetState.
    setCartState(nextState as CartWidgetState);
  }, [toolOutput, toolResponseMetadata]);

  function getIconForItem(name: string) {
    const words = name
      .toLowerCase()
      .replace(/[^a-z]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (const entry of iconMatchers) {
      if (entry.keywords.some((keyword) => words.includes(keyword))) {
        return entry.Icon;
      }
    }
    return JarIcon;
  }

  const itemCards = cartItems.length ? (
    <div className="space-y-3">
      {cartItems.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between rounded-2xl border border-black/20 bg-[#fffaf5] p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              {(() => {
                const Icon = getIconForItem(item.name);
                return <Icon className="h-6 w-6" />;
              })()}
            </div>
            <div>
              <p className="text-sm font-semibold text-black">{item.name}</p>
              <p className="text-xs text-black/60">
                Qty <span className="font-mono">{item.quantity ?? 0}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustQuantity(item.name, -1)}
              className="h-8 w-8 rounded-full border border-black/30 text-lg font-semibold text-black/70 transition hover:bg-white"
              aria-label={`Decrease ${item.name}`}
            >
              -
            </button>
            <button
              type="button"
              onClick={() => adjustQuantity(item.name, 1)}
              className="h-8 w-8 rounded-full border border-black/30 text-lg font-semibold text-black/70 transition hover:bg-white"
              aria-label={`Increase ${item.name}`}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-black/40 bg-[#fffaf5] p-6 text-center text-sm text-black/60">
      Your cart is empty. Add a few items to get started.
    </div>
  );

  return (
    <div
      className="min-h-screen w-full bg-white text-black bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_#ffffff_55%),radial-gradient(circle_at_bottom_right,_#eef2ff_0,_#ffffff_45%)]"
      style={{
        fontFamily: '"Trebuchet MS", "Gill Sans", "Lucida Grande", sans-serif',
      }}
      data-theme="light"
    >
      <style>{animationStyles}</style>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <header
          className="space-y-2"
          style={{ animation: "fadeUp 0.6s ease-out both" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
            Simple cart
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pick a few essentials
          </h1>
          <p className="text-sm text-black/70">
            Update your cart through the chat or tap to add a suggestion or
            adjust quantities.
          </p>
        </header>

        <div
          className="grid gap-8 lg:grid-cols-[1.4fr_1fr]"
          style={{
            animation: "fadeUp 0.7s ease-out both",
            animationDelay: "80ms",
          }}
        >
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-black/70">
                Suggested items
              </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestedItems.map(({ name, description, Icon }, index) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-black/20 bg-[#fffaf5] p-4"
                  style={{
                    animation: "fadeUp 0.5s ease-out both",
                    animationDelay: `${120 + index * 80}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-black">
                        {name}
                      </p>
                      <p className="text-xs text-black/60">{description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(name)}
                    className="rounded-full bg-amber-200 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-300"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-widest text-black/70">
                Cart
              </p>
              <span className="text-xs text-black/60">
                {cartItems.length} items
              </span>
            </header>
            {itemCards}
            <button
              type="button"
              disabled={cartItems.length === 0}
              className="w-full rounded-2xl border border-black/30 bg-white py-3 text-sm font-semibold text-black/70 transition hover:border-black/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Check out
            </button>
          </section>
        </div>

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-widest text-black/70">
              Widget state & output
            </p>
            <span className="text-xs text-black/60">Debug view</span>
          </header>
          <div className="grid gap-4 lg:grid-cols-2">
            <JsonPanel label="window.openai.widgetState" value={cartState} />
            <JsonPanel label="window.openai.toolOutput" value={toolOutput} />
          </div>
        </section>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("shopping-cart-root");
if (!rootElement) {
  throw new Error("Missing shopping-cart-root element");
}

createRoot(rootElement).render(<App />);
