"use client";

import type { ComponentType } from "react";
import { WeatherPreview } from "./widgets/weather";
import { ChartPreview } from "./widgets/chart";
import { StockPreview } from "./widgets/stock";
import { EventPreview } from "./widgets/event";
import { ConfirmPreview } from "./widgets/confirm";
import { OrderPreview } from "./widgets/order";
import { RevenuePreview } from "./widgets/revenue";
import { PlaylistPreview } from "./widgets/playlist";
import { ContactsPreview } from "./widgets/contacts";
import { ArticlePreview } from "./widgets/article";
import { FlightPreview } from "./widgets/flight";

export const WIDGET_PREVIEWS: Record<string, ComponentType> = {
  weather: WeatherPreview,
  chart: ChartPreview,
  stock: StockPreview,
  event: EventPreview,
  confirm: ConfirmPreview,
  order: OrderPreview,
  revenue: RevenuePreview,
  playlist: PlaylistPreview,
  contacts: ContactsPreview,
  article: ArticlePreview,
  flight: FlightPreview,
};
