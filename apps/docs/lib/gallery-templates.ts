import type { UISpec } from "@assistant-ui/react-generative-ui";

export type GalleryCategory =
  | "Data"
  | "Commerce"
  | "Scheduling"
  | "Interaction"
  | "Media"
  | "Content"
  | "Travel";

export type GalleryTemplate = {
  slug: string;
  title: string;
  description: string;
  category: GalleryCategory;
  tree: UISpec;
};

const booking: GalleryTemplate = {
  slug: "booking",
  title: "Table reservation",
  description:
    "A booking form collecting party size, date, and seating preference, submitted through the Card form model.",
  category: "Scheduling",
  tree: {
    $type: "Card",
    asForm: true,
    confirm: {
      label: "Confirm reservation",
      $action: { type: "book_reservation" },
    },
    cancel: { label: "Cancel" },
    children: [
      { $type: "Header", $key: "title", text: "Reserve a table", size: "md" },
      {
        $type: "Text",
        $key: "intro",
        value: "We hold the table for 15 minutes past the reserved time.",
        size: "sm",
        color: "secondary",
      },
      {
        $type: "Input",
        $key: "name",
        name: "guestName",
        label: "Name",
        placeholder: "Full name",
      },
      {
        $type: "Select",
        $key: "party",
        name: "partySize",
        label: "Party size",
        placeholder: "Select party size",
        options: [
          { label: "1 guest", value: "1" },
          { label: "2 guests", value: "2" },
          { label: "3 guests", value: "3" },
          { label: "4+ guests", value: "4" },
        ],
      },
      { $type: "DatePicker", $key: "date", name: "date", label: "Date" },
      {
        $type: "RadioGroup",
        $key: "seating",
        name: "seating",
        label: "Seating preference",
        defaultValue: "indoor",
        options: [
          { label: "Indoor", value: "indoor" },
          { label: "Patio", value: "patio" },
        ],
      },
      {
        $type: "Checkbox",
        $key: "reminder",
        name: "reminder",
        label: "Send a reminder 1 hour before",
      },
    ],
  },
};

const orderStatus: GalleryTemplate = {
  slug: "order-status",
  title: "Order tracking",
  description:
    "An order status card with a delivery timeline, badges per step, and quick actions.",
  category: "Commerce",
  tree: {
    $type: "Card",
    title: "Order #48213",
    children: [
      {
        $type: "Alert",
        $key: "alert",
        tone: "success",
        title: "Order confirmed",
        description: "Your order is on its way and should arrive today.",
      },
      {
        $type: "ListView",
        $key: "timeline",
        children: [
          {
            $type: "ListViewItem",
            $key: "placed",
            $action: { type: "view_order_event", eventId: "placed" },
            children: {
              $type: "Row",
              justify: "between",
              children: [
                {
                  $type: "Col",
                  $key: "label",
                  gap: 1,
                  children: [
                    {
                      $type: "Text",
                      $key: "title",
                      value: "Order placed",
                      weight: "medium",
                    },
                    {
                      $type: "Caption",
                      $key: "time",
                      value: "Today at 9:02 AM",
                    },
                  ],
                },
                {
                  $type: "Badge",
                  $key: "badge",
                  value: "Done",
                  variant: "success",
                },
              ],
            },
          },
          {
            $type: "ListViewItem",
            $key: "packed",
            $action: { type: "view_order_event", eventId: "packed" },
            children: {
              $type: "Row",
              justify: "between",
              children: [
                {
                  $type: "Col",
                  $key: "label",
                  gap: 1,
                  children: [
                    {
                      $type: "Text",
                      $key: "title",
                      value: "Packed",
                      weight: "medium",
                    },
                    {
                      $type: "Caption",
                      $key: "time",
                      value: "Today at 9:41 AM",
                    },
                  ],
                },
                {
                  $type: "Badge",
                  $key: "badge",
                  value: "Done",
                  variant: "success",
                },
              ],
            },
          },
          {
            $type: "ListViewItem",
            $key: "transit",
            $action: { type: "view_order_event", eventId: "transit" },
            children: {
              $type: "Row",
              justify: "between",
              children: [
                {
                  $type: "Col",
                  $key: "label",
                  gap: 1,
                  children: [
                    {
                      $type: "Text",
                      $key: "title",
                      value: "Out for delivery",
                      weight: "medium",
                    },
                    {
                      $type: "Caption",
                      $key: "time",
                      value: "Estimated 2:00 to 4:00 PM",
                    },
                  ],
                },
                {
                  $type: "Badge",
                  $key: "badge",
                  value: "In progress",
                  variant: "info",
                },
              ],
            },
          },
        ],
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Row",
        $key: "actions",
        justify: "end",
        children: [
          {
            $type: "Button",
            $key: "track",
            label: "Track package",
            buttonStyle: "outline",
            $action: { type: "track_order", orderId: "48213" },
          },
          {
            $type: "Button",
            $key: "support",
            label: "Contact support",
            buttonStyle: "ghost",
            $action: { type: "contact_support", orderId: "48213" },
          },
        ],
      },
    ],
  },
};

const portfolio: GalleryTemplate = {
  slug: "portfolio",
  title: "Portfolio overview",
  description:
    "A holdings summary combining key facts, an axis-labeled bar chart, and a table of positions.",
  category: "Data",
  tree: {
    $type: "Card",
    title: "Portfolio overview",
    children: [
      {
        $type: "Row",
        $key: "facts",
        gap: 6,
        children: [
          {
            $type: "Fact",
            $key: "value",
            label: "Total value",
            value: "$128,430",
          },
          { $type: "Fact", $key: "change", label: "Today", value: "+2.4%" },
          {
            $type: "Fact",
            $key: "positions",
            label: "Positions",
            value: "12",
          },
        ],
      },
      {
        $type: "Header",
        $key: "chart-header",
        text: "Performance",
        size: "sm",
      },
      {
        $type: "Chart",
        $key: "chart-bar",
        variant: "bar",
        showAxis: true,
        data: [
          { label: "Mon", value: 120400 },
          { label: "Tue", value: 121800 },
          { label: "Wed", value: 119600 },
          { label: "Thu", value: 124200 },
          { label: "Fri", value: 128430 },
        ],
      },
      {
        $type: "Table",
        $key: "holdings",
        columns: [
          { label: "Symbol" },
          { label: "Shares" },
          { label: "Price" },
          { label: "Value" },
        ],
        rows: [
          ["ACME", 40, "$182.10", "$7,284.00"],
          ["GLBX", 25, "$94.55", "$2,363.75"],
          ["NORT", 15, "$310.20", "$4,653.00"],
        ],
      },
      {
        $type: "Markdown",
        $key: "footnote",
        value:
          "Prices delayed by 15 minutes. See the [disclosure](/legal/disclosure) for details.",
      },
    ],
  },
};

const stays: GalleryTemplate = {
  slug: "stays",
  title: "Riverside Loft",
  description:
    "A stay card with a photo, location and rating details, and a booking action.",
  category: "Travel",
  tree: {
    $type: "Card",
    title: "Riverside Loft",
    children: [
      {
        $type: "Image",
        $key: "image",
        src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&q=80",
        alt: "Cozy loft interior with an open kitchen and a red armchair",
      },
      {
        $type: "Row",
        $key: "meta",
        justify: "between",
        align: "center",
        children: [
          {
            $type: "Caption",
            $key: "details",
            value: "Alfama · 2 guests · 1 bed",
          },
          {
            $type: "Badge",
            $key: "rating",
            value: "4.9",
            variant: "success",
          },
        ],
      },
      {
        $type: "Button",
        $key: "book",
        label: "Book for $142/night",
        buttonStyle: "primary",
        block: true,
        $action: { type: "book_stay", stayId: "riverside-loft" },
      },
    ],
  },
};

const flightTracker: GalleryTemplate = {
  slug: "flight-tracker",
  title: "Flight tracker",
  description:
    "A gradient flight card with a Box progress bar showing how far along the route the flight is.",
  category: "Travel",
  tree: {
    $type: "Card",
    background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    children: [
      {
        $type: "Row",
        $key: "airline-row",
        justify: "between",
        children: [
          { $type: "Caption", $key: "airline", value: "United · UA 872" },
          { $type: "Caption", $key: "status", value: "On time" },
        ],
      },
      {
        $type: "Row",
        $key: "cities",
        justify: "between",
        align: "center",
        children: [
          {
            $type: "Text",
            $key: "origin",
            value: "SFO",
            size: "3xl",
            weight: "bold",
          },
          {
            $type: "Text",
            $key: "arrow",
            value: "",
            color: "white-70",
            children: { $type: "Icon", name: "plane", size: "md" },
          },
          {
            $type: "Text",
            $key: "dest",
            value: "NRT",
            size: "3xl",
            weight: "bold",
          },
        ],
      },
      {
        $type: "Box",
        $key: "track",
        width: "100%",
        height: 6,
        radius: "full",
        background: "rgba(255, 255, 255, 0.25)",
        children: {
          $type: "Box",
          width: "62%",
          height: 6,
          radius: "full",
          background: "white",
        },
      },
      {
        $type: "Row",
        $key: "meta",
        justify: "between",
        children: [
          { $type: "Caption", $key: "elapsed", value: "6h 40m elapsed" },
          { $type: "Caption", $key: "remaining", value: "4h 10m remaining" },
        ],
      },
    ],
  },
};

const createEvent: GalleryTemplate = {
  slug: "create-event",
  title: "Create event",
  description:
    "A calendar day summary with three upcoming events and confirm/cancel actions to add it to the calendar.",
  category: "Scheduling",
  tree: {
    $type: "Card",
    confirm: {
      label: "Add to calendar",
      $action: { type: "add_to_calendar" },
    },
    cancel: { label: "Discard" },
    children: [
      {
        $type: "Row",
        $key: "date-header",
        gap: 3,
        align: "center",
        children: [
          {
            $type: "Text",
            $key: "day",
            value: "24",
            size: "3xl",
            weight: "bold",
          },
          {
            $type: "Col",
            $key: "date-meta",
            gap: 0,
            children: [
              {
                $type: "Text",
                $key: "month",
                value: "July",
                weight: "semibold",
              },
              { $type: "Caption", $key: "weekday", value: "Friday" },
            ],
          },
        ],
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Col",
        $key: "events",
        gap: 3,
        children: [
          {
            $type: "Row",
            $key: "event-1",
            align: "center",
            gap: 3,
            children: [
              {
                $type: "Box",
                $key: "accent",
                width: 3,
                height: 32,
                radius: "full",
                background: "var(--chart-1)",
              },
              {
                $type: "Col",
                $key: "info",
                gap: 0,
                children: [
                  {
                    $type: "Text",
                    $key: "title",
                    value: "Design review",
                    weight: "medium",
                  },
                  { $type: "Caption", $key: "time", value: "9:00 to 9:30 AM" },
                ],
              },
              { $type: "Spacer", $key: "spacer" },
              { $type: "Badge", $key: "tag", value: "Work", variant: "info" },
            ],
          },
          {
            $type: "Row",
            $key: "event-2",
            align: "center",
            gap: 3,
            children: [
              {
                $type: "Box",
                $key: "accent",
                width: 3,
                height: 32,
                radius: "full",
                background: "var(--chart-2)",
              },
              {
                $type: "Col",
                $key: "info",
                gap: 0,
                children: [
                  {
                    $type: "Text",
                    $key: "title",
                    value: "Lunch with Sam",
                    weight: "medium",
                  },
                  {
                    $type: "Caption",
                    $key: "time",
                    value: "12:30 to 1:30 PM",
                  },
                ],
              },
              { $type: "Spacer", $key: "spacer" },
              {
                $type: "Badge",
                $key: "tag",
                value: "Personal",
                variant: "warning",
              },
            ],
          },
          {
            $type: "Row",
            $key: "event-3",
            align: "center",
            gap: 3,
            children: [
              {
                $type: "Box",
                $key: "accent",
                width: 3,
                height: 32,
                radius: "full",
                background: "var(--chart-4)",
              },
              {
                $type: "Col",
                $key: "info",
                gap: 0,
                children: [
                  {
                    $type: "Text",
                    $key: "title",
                    value: "Flight to Tokyo",
                    weight: "medium",
                  },
                  { $type: "Caption", $key: "time", value: "6:45 PM" },
                ],
              },
              { $type: "Spacer", $key: "spacer" },
              {
                $type: "Badge",
                $key: "tag",
                value: "Travel",
                variant: "success",
              },
            ],
          },
        ],
      },
    ],
  },
};

const viewEvent: GalleryTemplate = {
  slug: "view-event",
  title: "View event",
  description: "A compact single-event summary card.",
  category: "Scheduling",
  tree: {
    $type: "Card",
    children: [
      { $type: "Caption", $key: "date", value: "Friday, July 24" },
      { $type: "Header", $key: "title", text: "Design review", size: "md" },
      {
        $type: "Caption",
        $key: "time",
        value: "9:00 to 9:30 AM · Conference Room B",
      },
    ],
  },
};

const playlist: GalleryTemplate = {
  slug: "playlist",
  title: "Playlist",
  description:
    "A media card with a cover image and a numbered track list, each row playable on its own.",
  category: "Media",
  tree: {
    $type: "Card",
    children: [
      {
        $type: "Image",
        $key: "cover",
        src: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=640&q=80",
        alt: "Recording studio with guitars on the wall and a mixing console lit in warm neon",
      },
      { $type: "Divider", $key: "divider" },
      { $type: "Header", $key: "title", text: "Focus Flow", size: "md" },
      {
        $type: "ListView",
        $key: "tracks",
        children: [
          {
            $type: "ListViewItem",
            $key: "t1",
            $action: { type: "play_track", trackId: "t1" },
            children: {
              $type: "Row",
              align: "center",
              gap: 3,
              children: [
                {
                  $type: "Text",
                  $key: "n",
                  value: "1",
                  size: "sm",
                  color: "secondary",
                },
                {
                  $type: "Image",
                  $key: "thumb",
                  src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&q=80",
                  alt: "",
                  size: "sm",
                  round: true,
                },
                {
                  $type: "Col",
                  $key: "info",
                  gap: 0,
                  children: [
                    {
                      $type: "Text",
                      $key: "title",
                      value: "Morning Light",
                      weight: "medium",
                    },
                    { $type: "Caption", $key: "artist", value: "Aria Sol" },
                  ],
                },
                { $type: "Spacer", $key: "spacer" },
                {
                  $type: "Button",
                  $key: "play",
                  label: "Play",
                  buttonStyle: "ghost",
                  $action: { type: "play_track", trackId: "t1" },
                  children: { $type: "Icon", name: "play", size: "sm" },
                },
              ],
            },
          },
          {
            $type: "ListViewItem",
            $key: "t2",
            $action: { type: "play_track", trackId: "t2" },
            children: {
              $type: "Row",
              align: "center",
              gap: 3,
              children: [
                {
                  $type: "Text",
                  $key: "n",
                  value: "2",
                  size: "sm",
                  color: "secondary",
                },
                {
                  $type: "Image",
                  $key: "thumb",
                  src: "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=640&q=80",
                  alt: "",
                  size: "sm",
                  round: true,
                },
                {
                  $type: "Col",
                  $key: "info",
                  gap: 0,
                  children: [
                    {
                      $type: "Text",
                      $key: "title",
                      value: "Slow Static",
                      weight: "medium",
                    },
                    { $type: "Caption", $key: "artist", value: "Field Notes" },
                  ],
                },
                { $type: "Spacer", $key: "spacer" },
                {
                  $type: "Button",
                  $key: "play",
                  label: "Play",
                  buttonStyle: "ghost",
                  $action: { type: "play_track", trackId: "t2" },
                  children: { $type: "Icon", name: "play", size: "sm" },
                },
              ],
            },
          },
          {
            $type: "ListViewItem",
            $key: "t3",
            $action: { type: "play_track", trackId: "t3" },
            children: {
              $type: "Row",
              align: "center",
              gap: 3,
              children: [
                {
                  $type: "Text",
                  $key: "n",
                  value: "3",
                  size: "sm",
                  color: "secondary",
                },
                {
                  $type: "Image",
                  $key: "thumb",
                  src: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=640&q=80",
                  alt: "",
                  size: "sm",
                  round: true,
                },
                {
                  $type: "Col",
                  $key: "info",
                  gap: 0,
                  children: [
                    {
                      $type: "Text",
                      $key: "title",
                      value: "Amber Hours",
                      weight: "medium",
                    },
                    { $type: "Caption", $key: "artist", value: "Aria Sol" },
                  ],
                },
                { $type: "Spacer", $key: "spacer" },
                {
                  $type: "Button",
                  $key: "play",
                  label: "Play",
                  buttonStyle: "ghost",
                  $action: { type: "play_track", trackId: "t3" },
                  children: { $type: "Icon", name: "play", size: "sm" },
                },
              ],
            },
          },
        ],
      },
      {
        $type: "Button",
        $key: "view-all",
        label: "View playlist",
        buttonStyle: "outline",
        block: true,
        $action: { type: "view_playlist" },
      },
    ],
  },
};

const rideStatus: GalleryTemplate = {
  slug: "ride-status",
  title: "Ride status",
  description: "A live ride card with a big ETA and pick-up/driver facts.",
  category: "Travel",
  tree: {
    $type: "Card",
    children: [
      { $type: "Header", $key: "eta", text: "Arriving in 4 min", size: "3xl" },
      {
        $type: "Text",
        $key: "car",
        value: "Toyota Camry · ABC 1234",
        color: "secondary",
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Row",
        $key: "facts",
        gap: 6,
        children: [
          {
            $type: "Row",
            $key: "pickup",
            align: "start",
            children: [
              { $type: "Icon", $key: "icon", name: "map-pin", size: "sm" },
              {
                $type: "Fact",
                $key: "fact",
                label: "Pick up",
                value: "123 Market St",
              },
            ],
          },
          {
            $type: "Fact",
            $key: "driver",
            label: "Driver",
            value: "Alex · 4.98 ★",
          },
        ],
      },
    ],
  },
};

const draftEmail: GalleryTemplate = {
  slug: "draft-email",
  title: "Draft email",
  description:
    "A composer Form with from/to/subject/body fields, submitting the collected values on send.",
  category: "Content",
  tree: {
    $type: "Card",
    title: "New message",
    children: {
      $type: "Form",
      $action: { type: "send_email" },
      children: [
        {
          $type: "Row",
          $key: "from-row",
          align: "center",
          children: [
            { $type: "Caption", $key: "from-label", value: "From" },
            {
              $type: "Text",
              $key: "from-value",
              value: "me@example.com",
              size: "sm",
            },
          ],
        },
        {
          $type: "Row",
          $key: "to-row",
          align: "center",
          children: [
            { $type: "Caption", $key: "to-label", value: "To" },
            {
              $type: "Input",
              $key: "to-input",
              name: "to",
              placeholder: "recipient@example.com",
            },
          ],
        },
        {
          $type: "Input",
          $key: "subject",
          name: "subject",
          label: "Subject",
          placeholder: "Subject",
        },
        {
          $type: "Input",
          $key: "body",
          name: "body",
          label: "Message",
          multiline: true,
          placeholder: "Write your message...",
        },
        {
          $type: "Row",
          $key: "actions",
          justify: "end",
          children: [
            {
              $type: "Button",
              $key: "discard",
              label: "Discard",
              buttonStyle: "ghost",
              $action: { type: "discard_email" },
            },
            {
              $type: "Button",
              $key: "send",
              label: "Send email",
              buttonStyle: "primary",
              submit: true,
            },
          ],
        },
      ],
    },
  },
};

const cart: GalleryTemplate = {
  slug: "cart",
  title: "Shopping cart",
  description:
    "A cart summary: line items, a Divider, subtotal/tax/total facts, and purchase actions.",
  category: "Commerce",
  tree: {
    $type: "Card",
    title: "Your cart",
    children: [
      {
        $type: "ListView",
        $key: "items",
        children: [
          {
            $type: "ListViewItem",
            $key: "item-1",
            children: {
              $type: "Row",
              justify: "between",
              children: [
                { $type: "Text", $key: "name", value: "Wireless Headphones" },
                { $type: "Caption", $key: "price", value: "$79.00" },
              ],
            },
          },
          {
            $type: "ListViewItem",
            $key: "item-2",
            children: {
              $type: "Row",
              justify: "between",
              children: [
                { $type: "Text", $key: "name", value: "USB-C Cable (2m)" },
                { $type: "Caption", $key: "price", value: "$12.00" },
              ],
            },
          },
          {
            $type: "ListViewItem",
            $key: "item-3",
            children: {
              $type: "Row",
              justify: "between",
              children: [
                { $type: "Text", $key: "name", value: "Phone Case" },
                { $type: "Caption", $key: "price", value: "$18.00" },
              ],
            },
          },
        ],
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Row",
        $key: "totals",
        justify: "between",
        children: [
          {
            $type: "Fact",
            $key: "subtotal",
            label: "Subtotal",
            value: "$109.00",
          },
          { $type: "Fact", $key: "tax", label: "Tax", value: "$9.81" },
          { $type: "Fact", $key: "total", label: "Total", value: "$118.81" },
        ],
      },
      {
        $type: "Row",
        $key: "actions",
        justify: "end",
        children: [
          {
            $type: "Button",
            $key: "add",
            label: "Add to cart",
            buttonStyle: "outline",
            $action: { type: "add_to_cart" },
          },
          {
            $type: "Button",
            $key: "purchase",
            label: "Purchase",
            buttonStyle: "primary",
            $action: { type: "purchase_cart" },
          },
        ],
      },
    ],
  },
};

const channelMessage: GalleryTemplate = {
  slug: "channel-message",
  title: "Channel message",
  description:
    "A chat message card with a channel/timestamp row, an author row with a round avatar, and a Markdown body.",
  category: "Content",
  tree: {
    $type: "Card",
    children: [
      {
        $type: "Row",
        $key: "meta",
        justify: "between",
        children: [
          { $type: "Caption", $key: "channel", value: "#product-updates" },
          { $type: "Caption", $key: "timestamp", value: "Today at 2:14 PM" },
        ],
      },
      {
        $type: "Row",
        $key: "author-row",
        align: "center",
        children: [
          {
            $type: "Image",
            $key: "avatar",
            src: "https://i.pravatar.cc/150?img=12",
            alt: "Jordan Lee",
            size: "sm",
            round: true,
          },
          {
            $type: "Text",
            $key: "author",
            value: "Jordan Lee",
            weight: "semibold",
          },
        ],
      },
      {
        $type: "Markdown",
        $key: "body",
        value:
          "Shipping three things this week:\n\n1. **Faster search** across the whole workspace\n2. **Dark mode** for the mobile app\n3. A refreshed **onboarding flow**\n\nLet us know what you think!",
      },
    ],
  },
};

const receipt: GalleryTemplate = {
  slug: "receipt",
  title: "Purchase receipt",
  description:
    "A receipt card (Badge instead of Alert) with the purchased item, delivery/seller/paid facts, and a details link.",
  category: "Commerce",
  tree: {
    $type: "Card",
    children: [
      {
        $type: "Badge",
        $key: "status",
        value: "Purchase complete",
        variant: "success",
        children: { $type: "Icon", name: "check", size: "sm" },
      },
      {
        $type: "Row",
        $key: "product",
        gap: 3,
        align: "center",
        children: [
          {
            $type: "Image",
            $key: "thumb",
            src: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=640&q=80",
            alt: "Mechanical keyboard",
            size: "sm",
          },
          {
            $type: "Col",
            $key: "info",
            gap: 0,
            children: [
              {
                $type: "Text",
                $key: "title",
                value: "Mechanical Keyboard, Tactile",
                weight: "medium",
              },
              { $type: "Caption", $key: "qty", value: "Qty 1" },
            ],
          },
        ],
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Col",
        $key: "facts",
        gap: 2,
        children: [
          {
            $type: "Fact",
            $key: "delivery",
            label: "Estimated delivery",
            value: "July 29 to August 1",
          },
          {
            $type: "Fact",
            $key: "seller",
            label: "Sold by",
            value: "Northwind Supply Co.",
          },
          { $type: "Fact", $key: "paid", label: "Paid", value: "$149.00" },
        ],
      },
      {
        $type: "Button",
        $key: "details",
        label: "View details",
        buttonStyle: "outline",
        $action: { type: "view_order_details" },
      },
    ],
  },
};

const playerCard: GalleryTemplate = {
  slug: "player-card",
  title: "Player card",
  description:
    "A stat card with four Col-laid-out stats beneath the player header.",
  category: "Data",
  tree: {
    $type: "Card",
    children: [
      { $type: "Header", $key: "name", text: "Marcus Chen", size: "lg" },
      { $type: "Caption", $key: "position", value: "Point Guard · #23" },
      {
        $type: "Row",
        $key: "stats",
        justify: "between",
        children: [
          {
            $type: "Col",
            $key: "pts",
            align: "center",
            gap: 1,
            children: [
              {
                $type: "Text",
                $key: "value",
                value: "24.6",
                size: "2xl",
                weight: "bold",
              },
              { $type: "Caption", $key: "label", value: "PPG" },
            ],
          },
          {
            $type: "Col",
            $key: "ast",
            align: "center",
            gap: 1,
            children: [
              {
                $type: "Text",
                $key: "value",
                value: "8.1",
                size: "2xl",
                weight: "bold",
              },
              { $type: "Caption", $key: "label", value: "AST" },
            ],
          },
          {
            $type: "Col",
            $key: "reb",
            align: "center",
            gap: 1,
            children: [
              {
                $type: "Text",
                $key: "value",
                value: "5.3",
                size: "2xl",
                weight: "bold",
              },
              { $type: "Caption", $key: "label", value: "REB" },
            ],
          },
          {
            $type: "Col",
            $key: "eff",
            align: "center",
            gap: 1,
            children: [
              {
                $type: "Text",
                $key: "value",
                value: "27.9",
                size: "2xl",
                weight: "bold",
              },
              { $type: "Caption", $key: "label", value: "EFF" },
            ],
          },
        ],
      },
    ],
  },
};

const eventSession: GalleryTemplate = {
  slug: "event-session",
  title: "Conference session",
  description:
    "A conference session card with a kicker, title, description, and two speaker rows with a View action.",
  category: "Content",
  tree: {
    $type: "Card",
    children: [
      { $type: "Caption", $key: "kicker", value: "TRACK 2 · AI ENGINEERING" },
      {
        $type: "Header",
        $key: "title",
        text: "Building Reliable Agent Loops",
        size: "md",
      },
      {
        $type: "Text",
        $key: "description",
        value:
          "A practical look at retries, tool-call verification, and human-in-the-loop patterns for production agents.",
        size: "sm",
        color: "secondary",
      },
      {
        $type: "Row",
        $key: "meta",
        gap: 3,
        children: [
          { $type: "Caption", $key: "location", value: "Hall B" },
          { $type: "Caption", $key: "time", value: "2:30 PM to 3:15 PM" },
        ],
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Row",
        $key: "speaker-1",
        justify: "between",
        align: "center",
        children: [
          {
            $type: "Row",
            $key: "info",
            align: "center",
            children: [
              {
                $type: "Image",
                $key: "avatar",
                src: "https://i.pravatar.cc/150?img=47",
                alt: "Priya Nair",
                size: "sm",
                round: true,
              },
              {
                $type: "Col",
                $key: "text",
                gap: 0,
                children: [
                  {
                    $type: "Text",
                    $key: "name",
                    value: "Priya Nair",
                    weight: "medium",
                  },
                  {
                    $type: "Caption",
                    $key: "title",
                    value: "Staff Engineer, Agentbase",
                  },
                ],
              },
            ],
          },
          {
            $type: "Button",
            $key: "view",
            label: "View",
            buttonStyle: "outline",
            $action: { type: "view_speaker", speakerId: "priya-nair" },
          },
        ],
      },
      {
        $type: "Row",
        $key: "speaker-2",
        justify: "between",
        align: "center",
        children: [
          {
            $type: "Row",
            $key: "info",
            align: "center",
            children: [
              {
                $type: "Image",
                $key: "avatar",
                src: "https://i.pravatar.cc/150?img=33",
                alt: "Devon Brooks",
                size: "sm",
                round: true,
              },
              {
                $type: "Col",
                $key: "text",
                gap: 0,
                children: [
                  {
                    $type: "Text",
                    $key: "name",
                    value: "Devon Brooks",
                    weight: "medium",
                  },
                  {
                    $type: "Caption",
                    $key: "title",
                    value: "Founding Engineer, Agentbase",
                  },
                ],
              },
            ],
          },
          {
            $type: "Button",
            $key: "view",
            label: "View",
            buttonStyle: "outline",
            $action: { type: "view_speaker", speakerId: "devon-brooks" },
          },
        ],
      },
    ],
  },
};

const notifyConfirm: GalleryTemplate = {
  slug: "notify-confirm",
  title: "Confirm dialog",
  description:
    "A compact confirmation card with Yes/No buttons carrying distinct actions.",
  category: "Interaction",
  tree: {
    $type: "Card",
    children: [
      { $type: "Header", $key: "title", text: "Delete this file?", size: "md" },
      {
        $type: "Text",
        $key: "question",
        value:
          "This action cannot be undone. Are you sure you want to continue?",
        size: "sm",
        color: "secondary",
      },
      {
        $type: "Row",
        $key: "actions",
        justify: "end",
        children: [
          {
            $type: "Button",
            $key: "no",
            label: "No",
            buttonStyle: "outline",
            $action: { type: "cancel_delete" },
          },
          {
            $type: "Button",
            $key: "yes",
            label: "Yes",
            buttonStyle: "primary",
            $action: { type: "confirm_delete" },
          },
        ],
      },
    ],
  },
};

const createTask: GalleryTemplate = {
  slug: "create-task",
  title: "Create task",
  description:
    "A short task-creation Form: title, description, due date, and a submit button.",
  category: "Interaction",
  tree: {
    $type: "Form",
    $action: { type: "create_task" },
    children: [
      {
        $type: "Input",
        $key: "title",
        name: "title",
        label: "Title",
        placeholder: "Task title",
      },
      {
        $type: "Input",
        $key: "description",
        name: "description",
        label: "Description",
        multiline: true,
        placeholder: "Add more detail...",
      },
      {
        $type: "DatePicker",
        $key: "due",
        name: "dueDate",
        label: "Due date",
      },
      {
        $type: "Button",
        $key: "create",
        label: "Create task",
        buttonStyle: "primary",
        block: true,
        submit: true,
      },
    ],
  },
};

const weatherCurrent: GalleryTemplate = {
  slug: "weather-current",
  title: "Current weather",
  description:
    "A warm-gradient weather card with a large temperature reading and conditions.",
  category: "Data",
  tree: {
    $type: "Card",
    background: "linear-gradient(135deg, #f97316, #facc15)",
    children: [
      {
        $type: "Row",
        $key: "header",
        justify: "between",
        align: "center",
        children: [
          {
            $type: "Text",
            $key: "city",
            value: "Austin, TX",
            color: "white-70",
          },
          { $type: "Icon", $key: "icon", name: "sun", size: "lg" },
        ],
      },
      {
        $type: "Text",
        $key: "temp",
        value: "94°F",
        size: "3xl",
        weight: "bold",
      },
      {
        $type: "Text",
        $key: "description",
        value: "Sunny, feels like 98°F",
        color: "white-70",
      },
    ],
  },
};

const softwarePurchase: GalleryTemplate = {
  slug: "software-purchase",
  title: "Software purchase",
  description:
    "A plan-purchase Card form with volume/frequency selects, a total fact, and confirm/discard actions.",
  category: "Interaction",
  tree: {
    $type: "Card",
    title: "Purchase Pro plan",
    asForm: true,
    confirm: { label: "Confirm", $action: { type: "confirm_purchase" } },
    cancel: { label: "Discard" },
    children: [
      {
        $type: "Input",
        $key: "purpose",
        name: "purpose",
        label: "What is it for?",
        placeholder: "e.g. Engineering team",
      },
      {
        $type: "Row",
        $key: "dates",
        gap: 3,
        children: [
          {
            $type: "DatePicker",
            $key: "start",
            name: "startDate",
            label: "Start date",
          },
          {
            $type: "DatePicker",
            $key: "end",
            name: "endDate",
            label: "Renewal date",
          },
        ],
      },
      {
        $type: "Row",
        $key: "selects",
        gap: 3,
        children: [
          {
            $type: "Select",
            $key: "seats",
            name: "seats",
            label: "Volume",
            placeholder: "Seats",
            options: [
              { label: "5 seats", value: "5" },
              { label: "10 seats", value: "10" },
              { label: "25 seats", value: "25" },
              { label: "50 seats", value: "50" },
            ],
          },
          {
            $type: "Select",
            $key: "frequency",
            name: "frequency",
            label: "Frequency",
            placeholder: "Billing",
            options: [
              { label: "Monthly", value: "monthly" },
              { label: "Annual", value: "annual" },
            ],
          },
        ],
      },
      { $type: "Divider", $key: "divider" },
      {
        $type: "Fact",
        $key: "total",
        label: "Total amount",
        value: "$125 per month",
      },
    ],
  },
};

const chartArea: GalleryTemplate = {
  slug: "chart-area",
  title: "Weekly active users",
  description: "A stacked two-series area chart with axis ticks and a legend.",
  category: "Data",
  tree: {
    $type: "Card",
    title: "Weekly active users",
    children: [
      {
        $type: "Chart",
        $key: "chart",
        variant: "area",
        stacked: true,
        showAxis: true,
        showLegend: true,
        series: [
          {
            label: "New users",
            data: [
              { label: "Mon", value: 320 },
              { label: "Tue", value: 410 },
              { label: "Wed", value: 380 },
              { label: "Thu", value: 460 },
              { label: "Fri", value: 520 },
              { label: "Sat", value: 300 },
              { label: "Sun", value: 260 },
            ],
          },
          {
            label: "Returning users",
            data: [
              { label: "Mon", value: 890 },
              { label: "Tue", value: 910 },
              { label: "Wed", value: 940 },
              { label: "Thu", value: 980 },
              { label: "Fri", value: 1020 },
              { label: "Sat", value: 760 },
              { label: "Sun", value: 700 },
            ],
          },
        ],
      },
    ],
  },
};

const chartLine: GalleryTemplate = {
  slug: "chart-line",
  title: "Response time",
  description: "A single-series line chart with axis ticks.",
  category: "Data",
  tree: {
    $type: "Card",
    title: "Response time (p50)",
    children: [
      {
        $type: "Chart",
        $key: "chart",
        variant: "line",
        showAxis: true,
        data: [
          { label: "12a", value: 120 },
          { label: "4a", value: 98 },
          { label: "8a", value: 210 },
          { label: "12p", value: 340 },
          { label: "4p", value: 280 },
          { label: "8p", value: 190 },
        ],
      },
    ],
  },
};

const chartBars: GalleryTemplate = {
  slug: "chart-bars",
  title: "Support tickets",
  description: "A stacked three-series bar chart with axis ticks and a legend.",
  category: "Data",
  tree: {
    $type: "Card",
    title: "Support tickets by channel",
    children: [
      {
        $type: "Chart",
        $key: "chart",
        variant: "bar",
        stacked: true,
        showAxis: true,
        showLegend: true,
        series: [
          {
            label: "Email",
            data: [
              { label: "W1", value: 42 },
              { label: "W2", value: 38 },
              { label: "W3", value: 51 },
              { label: "W4", value: 35 },
            ],
          },
          {
            label: "Chat",
            data: [
              { label: "W1", value: 28 },
              { label: "W2", value: 33 },
              { label: "W3", value: 25 },
              { label: "W4", value: 40 },
            ],
          },
          {
            label: "Phone",
            data: [
              { label: "W1", value: 12 },
              { label: "W2", value: 9 },
              { label: "W3", value: 15 },
              { label: "W4", value: 11 },
            ],
          },
        ],
      },
    ],
  },
};

// Ordered so the colored/image-rich "hero" templates (stays, flightTracker, weatherCurrent, playlist, and the three chart templates) land roughly every 3 to 4 entries, spreading them evenly across the masonry's 3 columns instead of clustering them in one column.
export const GALLERY_TEMPLATES: GalleryTemplate[] = [
  stays,
  booking,
  orderStatus,
  flightTracker,
  portfolio,
  createEvent,
  viewEvent,
  weatherCurrent,
  rideStatus,
  draftEmail,
  cart,
  playlist,
  channelMessage,
  receipt,
  chartArea,
  playerCard,
  eventSession,
  notifyConfirm,
  chartLine,
  createTask,
  softwarePurchase,
  chartBars,
];

export function getGalleryTemplate(slug: string): GalleryTemplate | undefined {
  return GALLERY_TEMPLATES.find((template) => template.slug === slug);
}

export const GALLERY_USAGE_SNIPPET = `import { JSONGenerativeUI } from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/generative-ui";
import { defineToolkit } from "@assistant-ui/react";

const generative = new JSONGenerativeUI({
  library: styledGenerativeUILibrary,
});

export default defineToolkit({
  // ...your other tools
  present: generative.present({ display: "standalone" }),
});
`;

export const GALLERY_USAGE_SNIPPET_FULL_STACK = `"use generative";

import {
  JSONGenerativeUI,
  defaultGenerativeUILibrary,
  defineGenerativeComponents,
} from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/generative-ui";
import { defineToolkit } from "@assistant-ui/react";

const markdown = defaultGenerativeUILibrary.Markdown!;

// Schemas resolve through the package's react-server split. Only \`render\`
// may reference the styled library: the compiler drops \`render\` (and the
// imports only it uses) from the server build, so this "use client" module
// never reaches the server graph.
const generative = new JSONGenerativeUI({
  library: {
    ...defaultGenerativeUILibrary,
    ...defineGenerativeComponents({
      Markdown: {
        properties: markdown.properties,
        streamProperties: markdown.streamProperties,
        description:
          "A markdown string, rendered with GitHub-flavored markdown.",
        render: styledGenerativeUILibrary.Markdown!.render,
      },
    }),
  },
});

export default defineToolkit({
  // ...your other tools
  present: generative.present({ display: "standalone" }),
});
`;
