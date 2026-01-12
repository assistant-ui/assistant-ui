import React from "react";
import { createRoot } from "react-dom/client";
import { Receipt, RotateCcw } from "lucide-react";
import { useWidgetProps } from "../use-widget-props";

const statusStyles = {
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  refunded: "bg-rose-50 text-rose-700 ring-rose-200",
  preparing: "bg-amber-50 text-amber-700 ring-amber-200",
};

function App() {
  const { orders = [] } = useWidgetProps({ orders: [] });
  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <div className="antialiased w-full text-black rounded-2xl border border-black/10 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-black/5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F46C21]/15 text-[#F46C21]">
          <Receipt strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">Past orders</div>
          <div className="text-sm text-black/60">
            Synced from your Pizzaz account
          </div>
        </div>
        <div className="ml-auto text-xs uppercase tracking-wide text-black/40">
          Last 30 days
        </div>
      </div>
      <div className="flex flex-col">
        {safeOrders.map((order) => (
          <div key={order.orderId} className="px-5 py-4 border-b border-black/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{order.orderId}</div>
                  <div
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      statusStyles[order.status] ?? "bg-black/5 text-black/70"
                    }`}
                  >
                    {order.status}
                  </div>
                </div>
                <div className="mt-1 text-sm text-black/70">
                  {order.restaurantName || "Pizza shop"} · {order.location}
                </div>
                <div className="mt-1 text-sm text-black/60">{order.placedAt}</div>
                <div className="mt-2 text-sm text-black/80">
                  {Array.isArray(order.items)
                    ? order.items.join(", ")
                    : String(order.items || "")}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <div className="text-base font-semibold">{order.total}</div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/70 hover:bg-black/5"
                >
                  <RotateCcw strokeWidth={1.5} className="h-3.5 w-3.5" />
                  Reorder
                </button>
              </div>
            </div>
          </div>
        ))}
        {safeOrders.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-black/60">
            No past orders yet.
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("mixed-auth-past-orders-root")).render(
  <App />
);
