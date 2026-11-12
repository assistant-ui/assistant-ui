# `@assistant-ui/remote-components-host-react`

React host for remote components: `<RemoteComponent src | html>`, `<RemoteHostProvider>`, host-rendered overlays.

```tsx
import { RemoteComponent } from "@assistant-ui/remote-components-host-react";

<RemoteComponent src="https://widgets.example/weather.html" city="Lisbon" onSelect={async (day) => console.log(day)} />;
```

Docs: https://www.assistant-ui.com/remote-components/docs/host-api
