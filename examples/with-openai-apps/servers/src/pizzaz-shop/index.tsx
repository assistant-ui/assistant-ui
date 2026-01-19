import clsx from "clsx";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { useDisplayMode } from "../use-display-mode";
import { useMaxHeight } from "../use-max-height";
import { useOpenAiGlobal } from "../use-openai-global";
import { useWidgetProps } from "../use-widget-props";
import { useWidgetState } from "../use-widget-state";

import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

type NutritionFact = {
  label: string;
  value: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  shortDescription?: string;
  detailSummary?: string;
  nutritionFacts?: NutritionFact[];
  highlights?: string[];
  tags?: string[];
  quantity: number;
  image: string;
};

type PizzazCartWidgetState = {
  state?: "checkout" | null;
  cartItems?: CartItem[];
  selectedCartItemId?: string | null;
};

type PizzazCartWidgetProps = {
  cartItems?: CartItem[];
  widgetState?: Partial<PizzazCartWidgetState> | null;
};

const SERVICE_FEE = 3;
const DELIVERY_FEE = 2.99;
const TAX_FEE = 3.4;
const CONTINUE_TO_PAYMENT_EVENT = "pizzaz-shop:continue-to-payment";

const FILTERS: Array<{
  id: "all" | "vegetarian" | "vegan" | "size" | "spicy";
  label: string;
  tag?: string;
}> = [
  { id: "all", label: "All" },
  { id: "vegetarian", label: "Vegetarian", tag: "vegetarian" },
  { id: "vegan", label: "Vegan", tag: "vegan" },
  { id: "size", label: "Size", tag: "size" },
  { id: "spicy", label: "Spicy", tag: "spicy" },
];

const INITIAL_CART_ITEMS: CartItem[] = [
  {
    id: "marys-chicken",
    name: "Mary's Chicken",
    price: 19.48,
    description:
      "Tender organic chicken breasts trimmed for easy cooking. Raised without antibiotics and air chilled for exceptional flavor.",
    shortDescription: "Organic chicken breasts",
    detailSummary: "4 lbs • $3.99/lb",
    nutritionFacts: [
      { label: "Protein", value: "8g" },
      { label: "Fat", value: "9g" },
      { label: "Sugar", value: "12g" },
      { label: "Calories", value: "160" },
    ],
    highlights: [
      "No antibiotics or added hormones.",
      "Air chilled and never frozen for peak flavor.",
      "Raised in the USA on a vegetarian diet.",
    ],
    quantity: 2,
    image: "https://persistent.oaistatic.com/pizzaz-cart-xl/chicken.png",
    tags: ["size"],
  },
  {
    id: "avocados",
    name: "Avocados",
    price: 1,
    description:
      "Creamy Hass avocados picked at peak ripeness. Ideal for smashing into guacamole or topping tacos.",
    shortDescription: "Creamy Hass avocados",
    detailSummary: "3 ct • $1.00/ea",
    nutritionFacts: [
      { label: "Fiber", value: "7g" },
      { label: "Fat", value: "15g" },
      { label: "Potassium", value: "485mg" },
      { label: "Calories", value: "160" },
    ],
    highlights: [
      "Perfectly ripe and ready for slicing.",
      "Rich in healthy fats and naturally creamy.",
    ],
    quantity: 2,
    image: "https://persistent.oaistatic.com/pizzaz-cart-xl/avocado.png",
    tags: ["vegan"],
  },
  {
    id: "hojicha-pizza",
    name: "Hojicha Pizza",
    price: 15.5,
    description:
      "Wood-fired crust layered with smoky hojicha tea sauce and melted mozzarella with a drizzle of honey for an adventurous slice.",
    shortDescription: "Smoky hojicha sauce & honey",
    detailSummary: '12" pie • Serves 2',
    nutritionFacts: [
      { label: "Protein", value: "14g" },
      { label: "Fat", value: "18g" },
      { label: "Sugar", value: "9g" },
      { label: "Calories", value: "320" },
    ],
    highlights: [
      "Smoky roasted hojicha glaze with honey drizzle.",
      "Stone-fired crust with a delicate char.",
    ],
    quantity: 2,
    image: "https://persistent.oaistatic.com/pizzaz-cart-xl/hojicha-pizza.png",
    tags: ["vegetarian", "size", "spicy"],
  },
  {
    id: "chicken-pizza",
    name: "Chicken Pizza",
    price: 7,
    description:
      "Classic thin-crust pizza topped with roasted chicken, caramelized onions, and herb pesto.",
    shortDescription: "Roasted chicken & pesto",
    detailSummary: '10" personal • Serves 1',
    nutritionFacts: [
      { label: "Protein", value: "20g" },
      { label: "Fat", value: "11g" },
      { label: "Carbs", value: "36g" },
      { label: "Calories", value: "290" },
    ],
    highlights: [
      "Roasted chicken with caramelized onions.",
      "Fresh basil pesto and mozzarella.",
    ],
    quantity: 1,
    image: "https://persistent.oaistatic.com/pizzaz-cart-xl/chicken-pizza.png",
    tags: ["size"],
  },
  {
    id: "matcha-pizza",
    name: "Matcha Pizza",
    price: 5,
    description:
      "Crisp dough spread with velvety matcha cream and mascarpone. Earthy green tea notes balance gentle sweetness.",
    shortDescription: "Velvety matcha cream",
    detailSummary: '8" dessert • Serves 2',
    nutritionFacts: [
      { label: "Protein", value: "6g" },
      { label: "Fat", value: "10g" },
      { label: "Sugar", value: "14g" },
      { label: "Calories", value: "240" },
    ],
    highlights: [
      "Stone-baked crust with delicate crunch.",
      "Matcha mascarpone with white chocolate drizzle.",
    ],
    quantity: 1,
    image: "https://persistent.oaistatic.com/pizzaz-cart-xl/matcha-pizza.png",
    tags: ["vegetarian"],
  },
  {
    id: "pesto-pizza",
    name: "Pesto Pizza",
    price: 12.5,
    description:
      "Hand-tossed crust brushed with bright basil pesto, layered with fresh mozzarella, and finished with roasted cherry tomatoes.",
    shortDescription: "Basil pesto & tomatoes",
    detailSummary: '12" pie • Serves 2',
    nutritionFacts: [
      { label: "Protein", value: "16g" },
      { label: "Fat", value: "14g" },
      { label: "Carbs", value: "28g" },
      { label: "Calories", value: "310" },
    ],
    highlights: [
      "House-made pesto with sweet basil and pine nuts.",
      "Roasted cherry tomatoes for a pop of acidity.",
    ],
    quantity: 1,
    image: "https://persistent.oaistatic.com/pizzaz-cart-xl/matcha-pizza.png",
    tags: ["vegetarian", "size"],
  },
];

const cloneCartItem = (item: CartItem): CartItem => ({
  ...item,
  nutritionFacts: item.nutritionFacts?.map((fact) => ({ ...fact })),
  highlights: item.highlights ? [...item.highlights] : undefined,
  tags: item.tags ? [...item.tags] : undefined,
});

const createDefaultCartItems = (): CartItem[] =>
  INITIAL_CART_ITEMS.map((item) => cloneCartItem(item));

const createDefaultWidgetState = (): PizzazCartWidgetState => ({
  state: null,
  cartItems: createDefaultCartItems(),
  selectedCartItemId: null,
});

const nutritionFactsEqual = (
  a?: NutritionFact[],
  b?: NutritionFact[]
): boolean => {
  if (!a?.length && !b?.length) {
    return true;
  }
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  return a.every((fact, index) => {
    const other = b[index];
    if (!other) {
      return false;
    }
    return fact.label === other.label && fact.value === other.value;
  });
};

const highlightsEqual = (a?: string[], b?: string[]): boolean => {
  if (!a?.length && !b?.length) {
    return true;
  }
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  return a.every((highlight, index) => highlight === b[index]);
};

const cartItemsEqual = (a: CartItem[], b: CartItem[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!right) {
      return false;
    }
    if (
      left.id !== right.id ||
      left.quantity !== right.quantity ||
      left.name !== right.name ||
      left.price !== right.price ||
      left.description !== right.description ||
      left.shortDescription !== right.shortDescription ||
      left.detailSummary !== right.detailSummary ||
      !nutritionFactsEqual(left.nutritionFacts, right.nutritionFacts) ||
      !highlightsEqual(left.highlights, right.highlights) ||
      !highlightsEqual(left.tags, right.tags) ||
      left.image !== right.image
    ) {
      return false;
    }
  }
  return true;
};

type SelectedCartItemPanelProps = {
  item: CartItem;
  onAdjustQuantity: (id: string, delta: number) => void;
};

function SelectedCartItemPanel({
  item,
  onAdjustQuantity,
}: SelectedCartItemPanelProps) {
  const nutritionFacts = Array.isArray(item.nutritionFacts)
    ? item.nutritionFacts
    : [];
  const highlights = Array.isArray(item.highlights) ? item.highlights : [];

  const hasNutritionFacts = nutritionFacts.length > 0;
  const hasHighlights = highlights.length > 0;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-none border-b border-black/5 bg-white">
        <div className="relative flex items-center justify-center overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            className="max-h-[320px] w-[80%] object-cover"
          />
          <div className="absolute inset-0 bg-black/[0.025]" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0">
            <p className="text-xl font-medium text-black">
              ${item.price.toFixed(2)}
            </p>
            <h2 className="text-base text-black">{item.name}</h2>
          </div>
          <div className="flex items-center rounded-full bg-black/[0.04] px-1 py-1 text-black">
            <Button
              type="button"
              variant="ghost"
              color="secondary"
              size="xs"
              uniform
              aria-label={`Decrease quantity of ${item.name}`}
              onClick={() => onAdjustQuantity(item.id, -1)}
            >
              <Minus
                strokeWidth={2}
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </Button>
            <span className="mx-2 min-w-[10px] text-center text-base font-medium">
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              color="secondary"
              size="xs"
              uniform
              aria-label={`Increase quantity of ${item.name}`}
              onClick={() => onAdjustQuantity(item.id, 1)}
            >
              <Plus
                strokeWidth={2}
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>

        <p className="text-sm text-black/60">{item.description}</p>

        {item.detailSummary ? (
          <p className="text-sm font-medium text-black">{item.detailSummary}</p>
        ) : null}

        {hasNutritionFacts ? (
          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-black/[0.05] px-4 py-2 text-center sm:grid-cols-4">
            {nutritionFacts.map((fact) => (
              <div key={`${item.id}-${fact.label}`} className="space-y-0.5">
                <p className="text-base font-medium text-black">{fact.value}</p>
                <p className="text-xs text-black/60">{fact.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        {hasHighlights ? (
          <div className="space-y-1 text-sm text-black/60">
            {highlights.map((highlight, index) => (
              <p key={`${item.id}-highlight-${index}`}>{highlight}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type CheckoutDetailsPanelProps = {
  shouldShowCheckoutOnly: boolean;
  subtotal: number;
  total: number;
  onContinueToPayment?: () => void;
};

function CheckoutDetailsPanel({
  shouldShowCheckoutOnly,
  subtotal,
  total,
  onContinueToPayment,
}: CheckoutDetailsPanelProps) {
  return (
    <>
      {!shouldShowCheckoutOnly && (
        <header className="hidden space-y-4 sm:block">
          <h2 className="text-xl text-black">Checkout details</h2>
        </header>
      )}

      <section className="space-y-4 border-t border-black/5 pt-3">
        <div className="space-y-0">
          <h3 className="text-sm font-medium">Delivery address</h3>
        </div>
        <div className="space-y-0">
          <p className="text-base text-sm font-medium text-slate-900">
            1234 Main St, San Francisco, CA
          </p>
          <p className="text-xs text-black/50">
            Leave at door - Delivery instructions
          </p>
        </div>

        <div className="mt-1 flex flex-row items-center gap-3">
          <div className="flex flex-1 items-center justify-between rounded-xl border border-black/35 bg-white px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-slate-900">Fast</p>
              <p className="line-clamp-1 text-xs text-black/50">
                50 min - 2 hr 10 min
              </p>
            </div>
            <span className="text-sm font-semibold text-[#047857]">Free</span>
          </div>
          <div className="flex flex-1 items-center justify-between rounded-xl border border-black/10 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-900">Priority</p>
              <p className="line-clamp-1 text-xs text-black/50">35 min</p>
            </div>
            <span className="text-sm font-semibold text-[#047857]">Free</span>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-black/5 pt-3">
        <div>
          <h3 className="text-sm font-medium text-black">Delivery tip</h3>
          <p className="text-xs text-black/50">100% goes to the shopper</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Button
            type="button"
            variant="soft"
            color="secondary"
            size="sm"
            className="flex-1"
          >
            5%
          </Button>
          <Button
            type="button"
            variant="solid"
            color="primary"
            size="sm"
            className="flex-1"
          >
            10%
          </Button>
          <Button
            type="button"
            variant="soft"
            color="secondary"
            size="sm"
            className="flex-1"
          >
            15%
          </Button>
          <Button
            type="button"
            variant="soft"
            color="secondary"
            size="sm"
            className="flex-1"
          >
            Other
          </Button>
        </div>
      </section>

      <section className="space-y-1 border-t border-black/5 pt-3 text-center">
        <div className="flex items-center justify-between">
          <span className="text-sm text-black/70">Subtotal</span>
          <span className="text-md text-black">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-black/70">Total</span>
          <span className="text-md font-medium text-black">
            ${total.toFixed(2)}
          </span>
        </div>
        <p className="mt-3 mb-4 border-b border-black/5 text-xs text-black/50"></p>
        <Button
          type="button"
          color="primary"
          variant="solid"
          size="md"
          className="mx-auto w-full max-w-xs"
          block
          onClick={onContinueToPayment}
        >
          Continue to payment
        </Button>
      </section>
    </>
  );
}

function App() {
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const isFullscreen = displayMode === "fullscreen";
  const widgetProps = useWidgetProps<PizzazCartWidgetProps>(() => ({}));
  const [widgetState, setWidgetState] = useWidgetState<PizzazCartWidgetState>(
    createDefaultWidgetState
  );
  const navigate = useNavigate();
  const location = useLocation();
  const isCheckoutRoute = useMemo(() => {
    const pathname = location?.pathname ?? "";
    if (!pathname) {
      return false;
    }

    return pathname === "/checkout" || pathname.endsWith("/checkout");
  }, [location?.pathname]);

  const defaultCartItems = useMemo(() => createDefaultCartItems(), []);
  const cartGridRef = useRef<HTMLDivElement | null>(null);
  const [gridColumnCount, setGridColumnCount] = useState(1);

  const mergeWithDefaultItems = useCallback(
    (items: CartItem[]): CartItem[] => {
      const existingIds = new Set(items.map((item) => item.id));
      const merged = items.map((item) => {
        const defaultItem = defaultCartItems.find(
          (candidate) => candidate.id === item.id
        );

        if (!defaultItem) {
          return cloneCartItem(item);
        }

        const enriched: CartItem = {
          ...cloneCartItem(defaultItem),
          ...item,
          tags: item.tags ? [...item.tags] : defaultItem.tags,
          nutritionFacts:
            item.nutritionFacts ??
            defaultItem.nutritionFacts?.map((fact) => ({ ...fact })),
          highlights:
            item.highlights != null
              ? [...item.highlights]
              : defaultItem.highlights
              ? [...defaultItem.highlights]
              : undefined,
        };

        return cloneCartItem(enriched);
      });

      defaultCartItems.forEach((defaultItem) => {
        if (!existingIds.has(defaultItem.id)) {
          merged.push(cloneCartItem(defaultItem));
        }
      });

      return merged;
    },
    [defaultCartItems]
  );

  const resolvedCartItems = useMemo(() => {
    if (Array.isArray(widgetState?.cartItems) && widgetState.cartItems.length) {
      return mergeWithDefaultItems(widgetState.cartItems);
    }

    if (
      Array.isArray(widgetProps?.widgetState?.cartItems) &&
      widgetProps.widgetState.cartItems.length
    ) {
      return mergeWithDefaultItems(widgetProps.widgetState.cartItems);
    }

    if (Array.isArray(widgetProps?.cartItems) && widgetProps.cartItems.length) {
      return mergeWithDefaultItems(widgetProps.cartItems);
    }

    return mergeWithDefaultItems(defaultCartItems);
  }, [
    defaultCartItems,
    mergeWithDefaultItems,
    widgetProps?.cartItems,
    widgetProps?.widgetState?.cartItems,
    widgetState,
  ]);

  const [cartItems, setCartItems] = useState<CartItem[]>(resolvedCartItems);

  useEffect(() => {
    setCartItems((previous) =>
      cartItemsEqual(previous, resolvedCartItems) ? previous : resolvedCartItems
    );
  }, [resolvedCartItems]);

  const resolvedSelectedCartItemId =
    widgetState?.selectedCartItemId ??
    widgetProps?.widgetState?.selectedCartItemId ??
    null;

  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(
    resolvedSelectedCartItemId
  );

  useEffect(() => {
    setSelectedCartItemId((prev) =>
      prev === resolvedSelectedCartItemId ? prev : resolvedSelectedCartItemId
    );
  }, [resolvedSelectedCartItemId]);

  const view = useOpenAiGlobal("view");
  const viewParams = view?.params;
  const isModalView = view?.mode === "modal";
  const checkoutFromState =
    (widgetState?.state ?? widgetProps?.widgetState?.state) === "checkout";
  const modalParams =
    viewParams && typeof viewParams === "object"
      ? (viewParams as {
          state?: unknown;
          cartItems?: unknown;
          subtotal?: unknown;
          total?: unknown;
          totalItems?: unknown;
        })
      : null;

  const modalState =
    modalParams && typeof modalParams.state === "string"
      ? (modalParams.state as string)
      : null;

  const isCartModalView = isModalView && modalState === "cart";
  const shouldShowCheckoutOnly =
    isCheckoutRoute || (isModalView && !isCartModalView);
  const wasModalViewRef = useRef(isModalView);

  useEffect(() => {
    if (!viewParams || typeof viewParams !== "object") {
      return;
    }

    const paramsWithSelection = viewParams as {
      selectedCartItemId?: unknown;
    };

    const selectedIdFromParams = paramsWithSelection.selectedCartItemId;

    if (
      typeof selectedIdFromParams === "string" &&
      selectedIdFromParams !== selectedCartItemId
    ) {
      setSelectedCartItemId(selectedIdFromParams);
      return;
    }

    if (selectedIdFromParams === null && selectedCartItemId !== null) {
      setSelectedCartItemId(null);
    }
  }, [selectedCartItemId, viewParams]);

  const [hoveredCartItemId, setHoveredCartItemId] = useState<string | null>(
    null
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const updateWidgetState = useCallback(
    (partial: Partial<PizzazCartWidgetState>) => {
      setWidgetState((previous) => ({
        ...createDefaultWidgetState(),
        ...(previous ?? {}),
        ...partial,
      }));
    },
    [setWidgetState]
  );

  useEffect(() => {
    if (!Array.isArray(widgetState?.cartItems)) {
      return;
    }

    const merged = mergeWithDefaultItems(widgetState.cartItems);

    if (!cartItemsEqual(widgetState.cartItems, merged)) {
      updateWidgetState({ cartItems: merged });
    }
  }, [mergeWithDefaultItems, updateWidgetState, widgetState?.cartItems]);

  useEffect(() => {
    if (wasModalViewRef.current && !isModalView && checkoutFromState) {
      updateWidgetState({ state: null });
    }

    wasModalViewRef.current = isModalView;
  }, [checkoutFromState, isModalView, updateWidgetState]);

  const adjustQuantity = useCallback(
    (id: string, delta: number) => {
      setCartItems((previousItems) => {
        const updatedItems = previousItems.map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        );

        if (!cartItemsEqual(previousItems, updatedItems)) {
          updateWidgetState({ cartItems: updatedItems });
        }

        return updatedItems;
      });
    },
    [updateWidgetState]
  );

  useEffect(() => {
    if (!shouldShowCheckoutOnly) {
      return;
    }

    setHoveredCartItemId(null);
  }, [shouldShowCheckoutOnly]);

  const manualCheckoutTriggerRef = useRef(false);

  const requestModalWithAnchor = useCallback(
    ({
      title,
      params,
      anchorElement,
    }: {
      title: string;
      params: Record<string, unknown>;
      anchorElement?: HTMLElement | null;
    }) => {
      if (isModalView) {
        return;
      }

      const anchorRect = anchorElement?.getBoundingClientRect();
      const anchor =
        anchorRect == null
          ? undefined
          : {
              top: anchorRect.top,
              left: anchorRect.left,
              width: anchorRect.width,
              height: anchorRect.height,
            };

      void (async () => {
        try {
          await window?.openai?.requestModal?.({
            title,
            params,
            ...(anchor ? { anchor } : {}),
          });
        } catch (error) {
          console.error("Failed to open checkout modal", error);
        }
      })();
    },
    [isModalView]
  );

  const openCheckoutModal = useCallback(
    (anchorElement?: HTMLElement | null) => {
      requestModalWithAnchor({
        title: "Checkout",
        params: { state: "checkout" },
        anchorElement,
      });
    },
    [requestModalWithAnchor]
  );

  const openCartItemModal = useCallback(
    ({
      selectedId,
      selectedName,
      anchorElement,
    }: {
      selectedId: string;
      selectedName: string | null;
      anchorElement?: HTMLElement | null;
    }) => {
      requestModalWithAnchor({
        title: selectedName ?? selectedId,
        params: { state: "checkout", selectedCartItemId: selectedId },
        anchorElement,
      });
    },
    [requestModalWithAnchor]
  );

  const handleCartItemSelect = useCallback(
    (id: string, anchorElement?: HTMLElement | null) => {
      const itemName = cartItems.find((item) => item.id === id)?.name ?? null;
      manualCheckoutTriggerRef.current = true;
      setSelectedCartItemId(id);
      updateWidgetState({ selectedCartItemId: id, state: "checkout" });
      openCartItemModal({
        selectedId: id,
        selectedName: itemName,
        anchorElement,
      });
    },
    [cartItems, openCartItemModal, updateWidgetState]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.price * Math.max(0, item.quantity),
        0
      ),
    [cartItems]
  );

  const total = subtotal + SERVICE_FEE + DELIVERY_FEE + TAX_FEE;

  const totalItems = useMemo(
    () =>
      cartItems.reduce((total, item) => total + Math.max(0, item.quantity), 0),
    [cartItems]
  );

  const visibleCartItems = useMemo(() => {
    if (!activeFilters.length) {
      return cartItems;
    }

    return cartItems.filter((item) => {
      const tags = item.tags ?? [];

      return activeFilters.every((filterId) => {
        const filterMeta = FILTERS.find((filter) => filter.id === filterId);
        if (!filterMeta?.tag) {
          return true;
        }
        return tags.includes(filterMeta.tag);
      });
    });
  }, [activeFilters, cartItems]);

  const updateItemColumnPlacement = useCallback(() => {
    const gridNode = cartGridRef.current;

    const width = gridNode?.offsetWidth ?? 0;

    let baseColumnCount = 1;
    if (width >= 768) {
      baseColumnCount = 3;
    } else if (width >= 640) {
      baseColumnCount = 2;
    }

    const columnCount = isFullscreen
      ? Math.max(baseColumnCount, 3)
      : baseColumnCount;

    if (gridNode) {
      gridNode.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
    }

    setGridColumnCount(columnCount);
  }, [isFullscreen]);

  const handleFilterToggle = useCallback(
    (id: string) => {
      setActiveFilters((previous) => {
        if (id === "all") {
          return [];
        }

        const isActive = previous.includes(id);
        if (isActive) {
          return [];
        }

        return [id];
      });

      requestAnimationFrame(() => {
        updateItemColumnPlacement();
      });
    },
    [updateItemColumnPlacement]
  );

  useEffect(() => {
    const node = cartGridRef.current;

    if (!node) {
      return;
    }

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            requestAnimationFrame(updateItemColumnPlacement);
          })
        : null;

    observer?.observe(node);
    window.addEventListener("resize", updateItemColumnPlacement);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateItemColumnPlacement);
    };
  }, [updateItemColumnPlacement]);

  const openCartModal = useCallback(
    (anchorElement?: HTMLElement | null) => {
      if (isModalView || shouldShowCheckoutOnly) {
        return;
      }

      requestModalWithAnchor({
        title: "Cart",
        params: {
          state: "cart",
          cartItems,
          subtotal,
          total,
          totalItems,
        },
        anchorElement,
      });
    },
    [
      cartItems,
      isModalView,
      requestModalWithAnchor,
      shouldShowCheckoutOnly,
      subtotal,
      total,
      totalItems,
    ]
  );

  type CartSummaryItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  };

  const cartSummaryItems: CartSummaryItem[] = useMemo(() => {
    if (!isCartModalView) {
      return [];
    }

    const items = Array.isArray(modalParams?.cartItems)
      ? modalParams?.cartItems
      : null;

    if (!items) {
      return cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: Math.max(0, item.quantity),
        image: item.image,
      }));
    }

    const sanitized = items
      .map((raw, index) => {
        if (!raw || typeof raw !== "object") {
          return null;
        }
        const candidate = raw as Record<string, unknown>;
        const id =
          typeof candidate.id === "string" ? candidate.id : `cart-${index}`;
        const name =
          typeof candidate.name === "string" ? candidate.name : "Item";
        const priceValue = Number(candidate.price);
        const quantityValue = Number(candidate.quantity);
        const price = Number.isFinite(priceValue) ? priceValue : 0;
        const quantity = Number.isFinite(quantityValue)
          ? Math.max(0, quantityValue)
          : 0;
        const image =
          typeof candidate.image === "string" ? candidate.image : undefined;

        return {
          id,
          name,
          price,
          quantity,
          image,
        } as CartSummaryItem;
      })
      .filter(Boolean) as CartSummaryItem[];

    if (sanitized.length === 0) {
      return cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: Math.max(0, item.quantity),
        image: item.image,
      }));
    }

    return sanitized;
  }, [cartItems, isCartModalView, modalParams?.cartItems]);

  const cartSummarySubtotal = useMemo(() => {
    if (!isCartModalView) {
      return subtotal;
    }

    const candidate = Number(modalParams?.subtotal);
    return Number.isFinite(candidate) ? candidate : subtotal;
  }, [isCartModalView, modalParams?.subtotal, subtotal]);

  const cartSummaryTotal = useMemo(() => {
    if (!isCartModalView) {
      return total;
    }

    const candidate = Number(modalParams?.total);
    return Number.isFinite(candidate) ? candidate : total;
  }, [isCartModalView, modalParams?.total, total]);

  const cartSummaryTotalItems = useMemo(() => {
    if (!isCartModalView) {
      return totalItems;
    }

    const candidate = Number(modalParams?.totalItems);
    return Number.isFinite(candidate) ? candidate : totalItems;
  }, [isCartModalView, modalParams?.totalItems, totalItems]);

  const handleContinueToPayment = useCallback(
    (event?: ReactMouseEvent<HTMLElement>) => {
      const anchorElement = event?.currentTarget ?? null;

      if (typeof window !== "undefined") {
        const detail = {
          subtotal: isCartModalView ? cartSummarySubtotal : subtotal,
          total: isCartModalView ? cartSummaryTotal : total,
          totalItems: isCartModalView ? cartSummaryTotalItems : totalItems,
        };

        try {
          window.dispatchEvent(
            new CustomEvent(CONTINUE_TO_PAYMENT_EVENT, { detail })
          );
        } catch (error) {
          console.error("Failed to dispatch checkout navigation event", error);
        }
      }

      if (isCartModalView) {
        return;
      }

      manualCheckoutTriggerRef.current = true;
      updateWidgetState({ state: "checkout" });
      const shouldNavigateToCheckout = isCartModalView || !isCheckoutRoute;

      if (shouldNavigateToCheckout) {
        navigate("/checkout");
        return;
      }

      openCheckoutModal(anchorElement);
    },
    [
      cartSummarySubtotal,
      cartSummaryTotal,
      cartSummaryTotalItems,
      isCartModalView,
      isCheckoutRoute,
      navigate,
      openCheckoutModal,
      subtotal,
      total,
      totalItems,
      updateWidgetState,
    ]
  );

  const handleSeeAll = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await window?.openai?.requestDisplayMode?.({ mode: "fullscreen" });
    } catch (error) {
      console.error("Failed to request fullscreen display mode", error);
    }
  }, []);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(updateItemColumnPlacement);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [updateItemColumnPlacement, visibleCartItems]);

  const selectedCartItem = useMemo(() => {
    if (selectedCartItemId == null) {
      return null;
    }
    return cartItems.find((item) => item.id === selectedCartItemId) ?? null;
  }, [cartItems, selectedCartItemId]);

  const selectedCartItemName = selectedCartItem?.name ?? null;
  const shouldShowSelectedCartItemPanel =
    selectedCartItem != null && !isFullscreen;

  useEffect(() => {
    if (isCheckoutRoute) {
      return;
    }

    if (!checkoutFromState) {
      return;
    }

    if (manualCheckoutTriggerRef.current) {
      manualCheckoutTriggerRef.current = false;
      return;
    }

    if (selectedCartItemId) {
      openCartItemModal({
        selectedId: selectedCartItemId,
        selectedName: selectedCartItemName,
      });
      return;
    }

    openCheckoutModal();
  }, [
    isCheckoutRoute,
    checkoutFromState,
    openCartItemModal,
    openCheckoutModal,
    selectedCartItemId,
    selectedCartItemName,
  ]);

  const cartPanel = (
    <section>
      {!shouldShowCheckoutOnly && (
        <header className="mb-4 flex flex-col gap-3 border-b border-black/5 px-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
          {!isFullscreen ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={(event) =>
                  openCartModal(event.currentTarget as HTMLElement)
                }
                aria-haspopup="dialog"
                variant="outline"
                color="secondary"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                <span>Cart</span>
              </Button>
            </div>
          ) : (
            <div className="text-lg text-black/70">Results</div>
          )}
          <nav className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => {
              const isActive =
                filter.id === "all"
                  ? activeFilters.length === 0
                  : activeFilters.includes(filter.id);

              return (
                <Button
                  key={filter.id}
                  type="button"
                  onClick={() => handleFilterToggle(filter.id)}
                  aria-pressed={isActive}
                  variant={isActive ? "solid" : "outline"}
                  color="primary"
                  size="sm"
                >
                  {filter.label}
                </Button>
              );
            })}
          </nav>
        </header>
      )}

      <LayoutGroup id="pizzas-grid">
        <div
          ref={cartGridRef}
          className={clsx(
            "mt-4 grid gap-[1.5px]",
            isFullscreen ? "grid-cols-3" : "sm:grid-cols-2 md:grid-cols-3"
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {visibleCartItems.map((item, index) => {
              const isHovered = hoveredCartItemId === item.id;
              const shortDescription =
                item.shortDescription ?? item.description.split(".")[0];
              const columnCount = Math.max(gridColumnCount, 1);
              const rowStartIndex =
                Math.floor(index / columnCount) * columnCount;
              const itemsRemaining = visibleCartItems.length - rowStartIndex;
              const rowSize = Math.min(columnCount, itemsRemaining);
              const positionInRow = index - rowStartIndex;

              const isSingle = rowSize === 1;
              const isLeft = positionInRow === 0;
              const isRight = positionInRow === rowSize - 1;

              return (
                <motion.article
                  layout
                  layoutId={item.id}
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 26,
                    mass: 0.8,
                  }}
                  onClick={(event) =>
                    handleCartItemSelect(
                      item.id,
                      event.currentTarget as HTMLElement
                    )
                  }
                  onMouseEnter={() => setHoveredCartItemId(item.id)}
                  onMouseLeave={() => setHoveredCartItemId(null)}
                  className={clsx(
                    "group mb-4 flex cursor-pointer flex-col overflow-hidden border border-transparent bg-white transition-colors",
                    isHovered && "border-[#0f766e]"
                  )}
                >
                  <div
                    className={clsx(
                      "relative overflow-hidden",
                      isSingle && "rounded-3xl",
                      !isSingle && isLeft && "rounded-l-3xl",
                      !isSingle && isRight && "rounded-r-3xl",
                      !isSingle && !isLeft && !isRight && "rounded-none"
                    )}
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      className="h-60 w-full object-cover transition-transform duration-200"
                    />

                    <div className="absolute inset-0 bg-black/[0.05]" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 pe-6 pt-3 pb-4 text-left">
                    <div className="space-y-0.5">
                      <p className="text-base font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="text-sm text-black/60">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    {shortDescription ? (
                      <p
                        className="text-sm leading-snug text-black/50"
                        title={shortDescription}
                      >
                        {shortDescription}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-full bg-black/[0.04] px-1.5 py-1 text-black">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full opacity-50 transition-colors hover:bg-slate-200 hover:opacity-100"
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            adjustQuantity(item.id, -1);
                          }}
                        >
                          <Minus
                            strokeWidth={2.5}
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </button>
                        <span className="min-w-[20px] px-1 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full opacity-50 transition-colors hover:bg-slate-200 hover:opacity-100"
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            adjustQuantity(item.id, 1);
                          }}
                        >
                          <Plus
                            strokeWidth={2.5}
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </section>
  );

  if (isCartModalView && !isCheckoutRoute) {
    return (
      <div className="flex w-full flex-col gap-6 px-4">
        <div className="divide-y divide-black/5">
          {cartSummaryItems.length ? (
            cartSummaryItems.map((item) => (
              <div
                key={`modal-${item.id}`}
                className="flex items-center gap-3 py-2"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/[0.05]" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-black/50">
                      ${item.price.toFixed(2)} • Qty{" "}
                      {Math.max(0, item.quantity)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-black">
                    ${(item.price * Math.max(0, item.quantity)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-black/20 bg-white/90 p-6 text-center text-sm text-black/50">
              Your cart is empty.
            </p>
          )}
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-sm font-medium text-black">
            <span>Subtotal</span>
            <span>${cartSummarySubtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black/60">
            <span>Total</span>
            <span>${cartSummaryTotal.toFixed(2)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleContinueToPayment}
          className="mx-auto mb-4 w-full rounded-full bg-[#FF5100] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff6a26] disabled:cursor-not-allowed disabled:bg-black/20"
          disabled={cartSummaryTotalItems === 0}
        >
          Continue to checkout
        </button>
      </div>
    );
  }

  const checkoutPanel = (
    <div
      className={
        shouldShowCheckoutOnly
          ? "space-y-4"
          : "space-y-4 overflow-hidden border-black/[0.075] pt-4 md:rounded-3xl md:border md:px-5 md:pb-5 md:shadow-[0px_6px_14px_rgba(0,0,0,0.06)]"
      }
    >
      {shouldShowSelectedCartItemPanel ? (
        <SelectedCartItemPanel
          item={selectedCartItem}
          onAdjustQuantity={adjustQuantity}
        />
      ) : (
        <CheckoutDetailsPanel
          shouldShowCheckoutOnly={shouldShowCheckoutOnly}
          subtotal={subtotal}
          total={total}
          onContinueToPayment={handleContinueToPayment}
        />
      )}
    </div>
  );

  return (
    <div
      className={clsx(
        `flex items-center justify-center overflow-hidden`,
        isModalView ? "px-0 pb-4" : ""
      )}
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
        overflow: "hidden",
        scrollbarGutter: "0px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <main
        className={`w-full overflow-hidden ${isFullscreen ? "max-w-7xl" : ""}`}
      >
        {shouldShowCheckoutOnly ? (
          checkoutPanel
        ) : isFullscreen ? (
          <div className="mt-8 grid gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] md:gap-8">
            <div className="md:col-span-2">{cartPanel}</div>
            <div>{checkoutPanel}</div>
          </div>
        ) : (
          cartPanel
        )}
        {!isFullscreen && !shouldShowCheckoutOnly && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSeeAll}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:border-black/40 hover:text-black"
            >
              See all items
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("pizzaz-shop-root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
