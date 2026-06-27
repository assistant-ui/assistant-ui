import type { UINode } from "@assistant-ui/react-generative-ui/ir";

export type GalleryWidgetSpec = {
  slug: string;
  title: string;
  description: string;
  category: "Productivity" | "Data" | "Commerce" | "Communication" | "Layout";
  spec: UINode;
};

export const galleryWidgets: GalleryWidgetSpec[] = [
  {
    slug: "weather",
    title: "Weather",
    description: "Current conditions with a 5-day forecast.",
    category: "Data",
    spec: {
      $type: "Card",
      background:
        "linear-gradient(135deg, oklch(0.5 0.2 250), oklch(0.55 0.18 200))",
      children: [
        {
          $type: "Col",
          gap: 3,
          align: "center",
          children: [
            { $type: "Icon", name: "cloud-sun", size: "2xl", color: "white" },
            {
              $type: "Row",
              gap: 2,
              align: "end",
              children: [
                {
                  $type: "Text",
                  value: "47\u00b0",
                  size: "3xl",
                  weight: "bold",
                  color: "white",
                },
                {
                  $type: "Text",
                  value: "69\u00b0",
                  size: "lg",
                  color: "white-50",
                },
              ],
            },
            {
              $type: "Text",
              value: "San Francisco, CA",
              color: "white-70",
              size: "sm",
            },
            {
              $type: "Text",
              value: "Partly sunny skies accompanied by some clouds",
              color: "white-50",
              size: "sm",
            },
            {
              $type: "Row",
              gap: 4,
              justify: "between",
              children: [
                {
                  $type: "Col",
                  gap: 1,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "cloud-sun",
                      size: "md",
                      color: "white-70",
                    },
                    {
                      $type: "Text",
                      value: "54\u00b0",
                      color: "white-70",
                      size: "sm",
                    },
                  ],
                },
                {
                  $type: "Col",
                  gap: 1,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "cloud-rain",
                      size: "md",
                      color: "white-70",
                    },
                    {
                      $type: "Text",
                      value: "54\u00b0",
                      color: "white-70",
                      size: "sm",
                    },
                  ],
                },
                {
                  $type: "Col",
                  gap: 1,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "cloud",
                      size: "md",
                      color: "white-70",
                    },
                    {
                      $type: "Text",
                      value: "54\u00b0",
                      color: "white-70",
                      size: "sm",
                    },
                  ],
                },
                {
                  $type: "Col",
                  gap: 1,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "wind",
                      size: "md",
                      color: "white-70",
                    },
                    {
                      $type: "Text",
                      value: "54\u00b0",
                      color: "white-70",
                      size: "sm",
                    },
                  ],
                },
                {
                  $type: "Col",
                  gap: 1,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "sun",
                      size: "md",
                      color: "white-70",
                    },
                    {
                      $type: "Text",
                      value: "54\u00b0",
                      color: "white-70",
                      size: "sm",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "flight",
    title: "Flight Tracker",
    description: "Departure and arrival with live status.",
    category: "Productivity",
    spec: {
      $type: "Card",
      background:
        "linear-gradient(135deg, oklch(0.25 0.05 260), oklch(0.3 0.08 240))",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Row",
              gap: 2,
              align: "center",
              justify: "between",
              children: [
                {
                  $type: "Row",
                  gap: 2,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "globe",
                      size: "md",
                      color: "white",
                    },
                    {
                      $type: "Text",
                      value: "PA 845",
                      weight: "semibold",
                      color: "white",
                    },
                  ],
                },
                {
                  $type: "Text",
                  value: "Fri, Apr 25",
                  color: "white-50",
                  size: "sm",
                },
              ],
            },
            {
              $type: "Row",
              gap: 4,
              align: "center",
              justify: "between",
              children: [
                {
                  $type: "Col",
                  gap: 0,
                  children: [
                    {
                      $type: "Text",
                      value: "SFO",
                      size: "2xl",
                      weight: "bold",
                      color: "white",
                    },
                    { $type: "Caption", value: "San Francisco" },
                  ],
                },
                { $type: "Icon", name: "plane", size: "lg", color: "white-50" },
                {
                  $type: "Col",
                  gap: 0,
                  children: [
                    {
                      $type: "Text",
                      value: "LHR",
                      size: "2xl",
                      weight: "bold",
                      color: "white",
                    },
                    { $type: "Caption", value: "London" },
                  ],
                },
              ],
            },
            { $type: "Divider" },
            {
              $type: "Row",
              gap: 4,
              justify: "between",
              children: [
                {
                  $type: "Col",
                  gap: 0,
                  children: [
                    { $type: "Caption", value: "Depart" },
                    {
                      $type: "Text",
                      value: "4:00 PM",
                      color: "white",
                      size: "sm",
                      weight: "medium",
                    },
                  ],
                },
                {
                  $type: "Col",
                  gap: 0,
                  children: [
                    { $type: "Caption", value: "Arrive" },
                    {
                      $type: "Text",
                      value: "10:25 AM +1",
                      color: "white",
                      size: "sm",
                      weight: "medium",
                    },
                  ],
                },
              ],
            },
            { $type: "Badge", value: "On Time", variant: "success" },
          ],
        },
      ],
    },
  },
  {
    slug: "stock",
    title: "Stock Ticker",
    description: "Live price with sparkline trend.",
    category: "Data",
    spec: {
      $type: "Card",
      title: "AAPL",
      children: [
        {
          $type: "Col",
          gap: 2,
          children: [
            {
              $type: "Row",
              gap: 2,
              align: "center",
              children: [
                { $type: "Text", value: "$189.42", size: "xl", weight: "bold" },
                {
                  $type: "Row",
                  gap: 1,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "trending-up",
                      size: "sm",
                      color: "muted",
                    },
                    { $type: "Badge", value: "+2.34%", variant: "success" },
                  ],
                },
              ],
            },
            {
              $type: "Chart",
              variant: "line",
              color: "oklch(0.6 0.15 150)",
              data: [
                { label: "9:30", value: 186 },
                { label: "10", value: 187 },
                { label: "11", value: 188 },
                { label: "12", value: 189 },
                { label: "1", value: 191 },
                { label: "2", value: 190 },
                { label: "3", value: 189 },
                { label: "4", value: 189 },
              ],
            },
            { $type: "Caption", value: "Last updated: 4:00 PM ET" },
          ],
        },
      ],
    },
  },
  {
    slug: "schedule",
    title: "Daily Schedule",
    description: "A day's meetings with times and titles.",
    category: "Productivity",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Row",
              gap: 3,
              align: "center",
              children: [
                {
                  $type: "Col",
                  gap: 0,
                  children: [
                    { $type: "Text", value: "28", size: "3xl", weight: "bold" },
                    { $type: "Caption", value: "Friday" },
                  ],
                },
                {
                  $type: "Col",
                  gap: 1,
                  children: [
                    { $type: "Text", value: "Lunch", weight: "medium" },
                    { $type: "Caption", value: "12:00 - 12:45 PM" },
                  ],
                },
              ],
            },
            { $type: "Divider" },
            {
              $type: "Col",
              gap: 2,
              children: [
                {
                  $type: "Row",
                  gap: 3,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "clock",
                      size: "sm",
                      color: "muted",
                    },
                    { $type: "Text", value: "1:00", weight: "medium" },
                    {
                      $type: "Text",
                      value: "Q1 roadmap review",
                      color: "secondary",
                      size: "sm",
                    },
                  ],
                },
                {
                  $type: "Row",
                  gap: 3,
                  align: "center",
                  children: [
                    {
                      $type: "Icon",
                      name: "clock",
                      size: "sm",
                      color: "muted",
                    },
                    { $type: "Text", value: "3:30", weight: "medium" },
                    {
                      $type: "Text",
                      value: "Team standup",
                      color: "secondary",
                      size: "sm",
                    },
                  ],
                },
              ],
            },
            { $type: "Divider" },
            {
              $type: "Row",
              gap: 2,
              children: [
                {
                  $type: "Button",
                  label: "Add to calendar",
                  buttonStyle: "primary",
                },
                { $type: "Button", label: "Discard", buttonStyle: "ghost" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "order",
    title: "Order Summary",
    description: "Purchase confirmation with items and total.",
    category: "Commerce",
    spec: {
      $type: "Card",
      title: "Order #4821",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Table",
              columns: [
                { label: "Item" },
                { label: "Qty" },
                { label: "Price" },
              ],
              rows: [
                ["Black Sugar Hoick Latte", "1", "$6.50"],
                ["Classic Milk Tea", "1", "$6.75"],
                ["Matcha Latte", "1", "$6.50"],
              ],
            },
            { $type: "Divider" },
            {
              $type: "Col",
              gap: 1,
              children: [
                {
                  $type: "Row",
                  justify: "between",
                  children: [
                    { $type: "Caption", value: "Subtotal" },
                    { $type: "Caption", value: "$19.75" },
                  ],
                },
                {
                  $type: "Row",
                  justify: "between",
                  children: [
                    { $type: "Caption", value: "Sales tax (8.75%)" },
                    { $type: "Caption", value: "$1.72" },
                  ],
                },
                {
                  $type: "Row",
                  justify: "between",
                  children: [
                    { $type: "Text", value: "Total", weight: "semibold" },
                    { $type: "Text", value: "$21.47", weight: "bold" },
                  ],
                },
              ],
            },
            {
              $type: "Row",
              gap: 2,
              children: [
                {
                  $type: "Button",
                  label: "Purchase",
                  buttonStyle: "primary",
                  block: true,
                },
                {
                  $type: "Button",
                  label: "Add to cart",
                  buttonStyle: "outline",
                  block: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "event",
    title: "Event Invite",
    description: "Calendar event with RSVP actions.",
    category: "Communication",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Row",
              gap: 3,
              align: "center",
              children: [
                { $type: "Icon", name: "calendar", size: "lg", color: "muted" },
                {
                  $type: "Col",
                  gap: 1,
                  children: [
                    {
                      $type: "Text",
                      value: "Q1 Roadmap Review",
                      weight: "semibold",
                    },
                    {
                      $type: "Caption",
                      value: "Friday, Dec 28 · 1:00 - 2:00 PM",
                    },
                  ],
                },
              ],
            },
            { $type: "Divider" },
            { $type: "Caption", value: "Google Meet · 30 minutes" },
            {
              $type: "Row",
              gap: 2,
              children: [
                { $type: "Badge", value: "4 accepted", variant: "success" },
                { $type: "Badge", value: "1 pending", variant: "warning" },
              ],
            },
            {
              $type: "Row",
              gap: 2,
              children: [
                {
                  $type: "Button",
                  label: "Accept",
                  buttonStyle: "primary",
                  $action: { type: "rsvp", response: "accept" },
                },
                {
                  $type: "Button",
                  label: "Decline",
                  buttonStyle: "ghost",
                  $action: { type: "rsvp", response: "decline" },
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "confirm",
    title: "Confirmation",
    description: "Destructive action confirmation with alert.",
    category: "Productivity",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 4,
          children: [
            {
              $type: "Alert",
              title: "Delete repository?",
              description:
                "This action cannot be undone. All files and history will be permanently deleted.",
              tone: "danger",
            },
            {
              $type: "Row",
              gap: 2,
              justify: "end",
              children: [
                { $type: "Button", label: "Cancel", buttonStyle: "ghost" },
                { $type: "Button", label: "Delete", buttonStyle: "danger" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "analytics",
    title: "Analytics",
    description: "Monthly traffic split between desktop and mobile.",
    category: "Data",
    spec: {
      $type: "Card",
      title: "Active users",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            { $type: "Caption", value: "Monthly traffic split, Jan-Jun" },
            {
              $type: "Chart",
              variant: "line",
              color: "oklch(0.55 0.2 250)",
              data: [
                { label: "Jan", value: 320 },
                { label: "Feb", value: 380 },
                { label: "Mar", value: 420 },
                { label: "Apr", value: 510 },
                { label: "May", value: 480 },
                { label: "Jun", value: 590 },
              ],
            },
            {
              $type: "Row",
              gap: 2,
              children: [
                { $type: "Badge", value: "Desktop 62%", variant: "secondary" },
                { $type: "Badge", value: "Mobile 38%", variant: "outline" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "email",
    title: "Email Compose",
    description: "A compose form with recipient, subject, and body.",
    category: "Communication",
    spec: {
      $type: "Card",
      title: "New email",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Col",
              gap: 2,
              children: [
                { $type: "Caption", value: "To" },
                { $type: "Input", placeholder: "name@example.com" },
                { $type: "Caption", value: "Subject" },
                { $type: "Input", placeholder: "Email subject" },
                { $type: "Caption", value: "Message" },
                {
                  $type: "Input",
                  placeholder: "Write your message\u2026",
                  multiline: true,
                },
              ],
            },
            {
              $type: "Row",
              gap: 2,
              children: [
                {
                  $type: "Button",
                  label: "Send email",
                  buttonStyle: "primary",
                  $action: { type: "send_email" },
                },
                { $type: "Button", label: "Discard", buttonStyle: "ghost" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "purchase",
    title: "Purchase Confirmation",
    description: "A completed order with delivery estimate.",
    category: "Commerce",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Row",
              gap: 3,
              align: "center",
              children: [
                {
                  $type: "Icon",
                  name: "check-circle",
                  size: "2xl",
                  color: "muted",
                },
                {
                  $type: "Col",
                  gap: 1,
                  children: [
                    {
                      $type: "Text",
                      value: "Purchase complete",
                      weight: "semibold",
                    },
                    { $type: "Caption", value: "Blue folding chair" },
                    {
                      $type: "Caption",
                      value: "Free delivery · 14-day returns",
                    },
                    {
                      $type: "Caption",
                      value: "Estimated delivery: Thursday, Oct 8",
                    },
                  ],
                },
              ],
            },
            { $type: "Divider" },
            {
              $type: "Row",
              justify: "between",
              children: [
                { $type: "Caption", value: "Sold by OpenAI" },
                { $type: "Text", value: "Paid $20.00", weight: "semibold" },
              ],
            },
            {
              $type: "Button",
              label: "View details",
              buttonStyle: "outline",
              block: true,
            },
          ],
        },
      ],
    },
  },
  {
    slug: "task",
    title: "Create Task",
    description: "A task creation form with title, description, and date.",
    category: "Productivity",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            { $type: "Text", value: "New task", weight: "semibold" },
            {
              $type: "Col",
              gap: 2,
              children: [
                { $type: "Input", placeholder: "Task title", label: "Title" },
                {
                  $type: "Input",
                  placeholder: "Describe the task\u2026",
                  multiline: true,
                  label: "Description",
                },
                { $type: "DatePicker", label: "Due date" },
              ],
            },
            {
              $type: "Button",
              label: "Create task",
              buttonStyle: "primary",
              block: true,
            },
          ],
        },
      ],
    },
  },
  {
    slug: "notification",
    title: "Notification",
    description: "A yes/no prompt for enabling notifications.",
    category: "Communication",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Row",
              gap: 3,
              align: "center",
              children: [
                { $type: "Icon", name: "bell", size: "lg", color: "muted" },
                {
                  $type: "Text",
                  value: "Enable notification",
                  weight: "semibold",
                },
              ],
            },
            { $type: "Caption", value: "Notify me when this item ships" },
            {
              $type: "Row",
              gap: 2,
              children: [
                {
                  $type: "Button",
                  label: "Yes",
                  buttonStyle: "primary",
                  $action: { type: "notify", choice: "yes" },
                },
                {
                  $type: "Button",
                  label: "No",
                  buttonStyle: "outline",
                  $action: { type: "notify", choice: "no" },
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "playlist",
    title: "Playlist",
    description: "A music playlist with track list and play controls.",
    category: "Layout",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Row",
              gap: 3,
              align: "center",
              children: [
                { $type: "Icon", name: "music", size: "lg", color: "muted" },
                { $type: "Text", value: "Retro Vinyl", weight: "semibold" },
                { $type: "Badge", value: "8 tracks", variant: "secondary" },
              ],
            },
            { $type: "Divider" },
            {
              $type: "Col",
              gap: 2,
              children: [
                {
                  $type: "Row",
                  gap: 3,
                  align: "center",
                  justify: "between",
                  children: [
                    { $type: "Text", value: "1. Neon Polaroid", size: "sm" },
                    { $type: "Caption", value: "3:42" },
                  ],
                },
                {
                  $type: "Row",
                  gap: 3,
                  align: "center",
                  justify: "between",
                  children: [
                    { $type: "Text", value: "2. Morning Grain", size: "sm" },
                    { $type: "Caption", value: "4:15" },
                  ],
                },
                {
                  $type: "Row",
                  gap: 3,
                  align: "center",
                  justify: "between",
                  children: [
                    { $type: "Text", value: "3. Blue Hour", size: "sm" },
                    { $type: "Caption", value: "2:58" },
                  ],
                },
              ],
            },
            {
              $type: "Button",
              label: "View playlist",
              buttonStyle: "outline",
              block: true,
            },
          ],
        },
      ],
    },
  },
  {
    slug: "sports",
    title: "Sports Stats",
    description: "A player card with season statistics.",
    category: "Data",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            { $type: "Text", value: "Froge (#22)", weight: "semibold" },
            { $type: "Divider" },
            {
              $type: "Row",
              gap: 4,
              children: [
                { $type: "Fact", label: "PTS", value: "18" },
                { $type: "Fact", label: "YDS", value: "141" },
                { $type: "Fact", label: "TKL", value: "2" },
                { $type: "Fact", label: "LEAPS", value: "17" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "session",
    title: "Session Info",
    description: "A conference breakout session with speakers.",
    category: "Communication",
    spec: {
      $type: "Card",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            { $type: "Badge", value: "Breakout session", variant: "warning" },
            {
              $type: "Text",
              value: "Orchestrating Agents at Scale",
              weight: "semibold",
            },
            {
              $type: "Text",
              value:
                "Click, connect, create. Learn how to quickly design and deploy enterprise-grade agents.",
              color: "secondary",
              size: "sm",
            },
            { $type: "Divider" },
            {
              $type: "Col",
              gap: 1,
              children: [
                { $type: "Caption", value: "Cowell Theater" },
                { $type: "Caption", value: "11:15 AM - 12:00 PM" },
              ],
            },
            { $type: "Button", label: "View", buttonStyle: "outline" },
          ],
        },
      ],
    },
  },
  {
    slug: "install-chart",
    title: "Install Mix",
    description: "Platform distribution as a bar chart.",
    category: "Data",
    spec: {
      $type: "Card",
      title: "Install mix",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            { $type: "Caption", value: "Desktop vs mobile, last 7 days" },
            {
              $type: "Chart",
              variant: "bar",
              color: "oklch(0.65 0.15 200)",
              data: [
                { label: "Desktop", value: 420 },
                { label: "Android", value: 280 },
                { label: "iOS", value: 190 },
              ],
            },
            {
              $type: "Row",
              gap: 2,
              children: [
                { $type: "Badge", value: "Desktop 47%", variant: "secondary" },
                { $type: "Badge", value: "Android 31%", variant: "outline" },
                { $type: "Badge", value: "iOS 22%", variant: "outline" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "subscription",
    title: "Subscription Form",
    description: "A software purchase with vendor, dates, and pricing.",
    category: "Commerce",
    spec: {
      $type: "Card",
      title: "Software purchase",
      children: [
        {
          $type: "Col",
          gap: 3,
          children: [
            {
              $type: "Col",
              gap: 2,
              children: [
                { $type: "Caption", value: "Vendor or tool" },
                { $type: "Input", placeholder: "ChatGPT Business" },
                {
                  $type: "Row",
                  gap: 2,
                  children: [
                    { $type: "DatePicker", label: "Start date" },
                    { $type: "DatePicker", label: "End date" },
                  ],
                },
                { $type: "Caption", value: "Volume" },
                { $type: "Input", placeholder: "5 seats" },
              ],
            },
            { $type: "Divider" },
            {
              $type: "Row",
              justify: "between",
              children: [
                { $type: "Text", value: "Total", weight: "medium" },
                { $type: "Text", value: "$125 / month", weight: "bold" },
              ],
            },
            {
              $type: "Row",
              gap: 2,
              children: [
                { $type: "Button", label: "Confirm", buttonStyle: "primary" },
                { $type: "Button", label: "Discard", buttonStyle: "ghost" },
              ],
            },
          ],
        },
      ],
    },
  },
];
