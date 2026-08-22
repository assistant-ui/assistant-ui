# Claude AI Assistant Demo

A comprehensive demo application showcasing the assistant-ui library with Claude AI backend, featuring:

- **Web App**: Next.js + TypeScript/React demo with Claude integration
- **iOS App**: SwiftUI native app for iPad Air M2+ with WebView embedding

## Quick Start

### Web Demo

```bash
cd apps/claude-demo/web
pnpm install
pnpm dev
```

Visit `http://localhost:3000`

### iOS App

Open `apps/claude-demo/ios/AssistantDemo.xcodeproj` in Xcode and run on iPad Air M2 or newer.

## Features

✨ **Claude Integration**
- Real-time streaming with Claude 3.5 Sonnet
- Support for attachments and file uploads
- Advanced tool use and function calling

🎨 **UI Components**
- Composable Thread UI
- Message display with markdown support
- Composer with rich text editing
- Auto-scroll and retry logic

📱 **Cross-Platform**
- Responsive web interface
- Native iOS app with WebView
- iPad-optimized layouts

## Architecture

```
claude-demo/
├── web/                      # Next.js web application
│   ├── app/                  # App directory structure
│   ├── components/           # React components
│   ├── lib/                  # Utilities
│   └── public/               # Static assets
└── ios/                      # SwiftUI iOS application
    ├── AssistantDemo/        # Main app target
    ├── AssistantDemoTests/   # Unit tests
    └── AssistantDemo.xcodeproj
```

## Environment Variables

### Web App (.env.local)

```env
ANTHROPIC_API_KEY=your_claude_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### iOS App

Configure in Xcode:
1. Create an API endpoint on your web backend
2. Update `Config.swift` with your endpoint URL
3. Use OAuth or token-based auth for security

## iOS Requirements

- iOS 17.0+
- iPad Air (5th generation/M1) or newer
- iPad Air M2+ recommended for optimal performance
- 200MB free space

## Documentation

- [assistant-ui Docs](https://www.assistant-ui.com/docs)
- [Claude API Reference](https://docs.anthropic.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [SwiftUI Documentation](https://developer.apple.com/xcode/swiftui/)

## License

MIT
