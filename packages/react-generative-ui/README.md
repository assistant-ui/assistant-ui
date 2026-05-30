# @assistant-ui/react-generative-ui

Generative UI tools for assistant-ui.

## Installation

```bash
npm install @assistant-ui/react-generative-ui
```

## Usage

```tsx
import { jsonGenerativeUITools } from "@assistant-ui/react-generative-ui";
import { Tools } from "@assistant-ui/react";

const library = {
  components: {
    Card: CardComponent,
    Button: ButtonComponent,
  },
};

const toolkit = jsonGenerativeUITools({ library });

function App() {
  return (
    <Thread>
      <Tools toolkit={toolkit} />
      <MessageList />
      <Composer />
    </Thread>
  );
}
```

## License

MIT