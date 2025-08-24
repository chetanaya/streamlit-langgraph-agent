# AI Assistant Frontend

A modern React TypeScript frontend for the AI Assistant chat application with real-time WebSocket communication, voice interaction, and dynamic UI updates.

## Features

- **Real-time Chat**: WebSocket-based communication with streaming responses
- **Voice Interaction**: Speech-to-text input and text-to-speech output
- **Agent Selection**: Choose from different AI agents and models
- **Tool Call Visualization**: Expandable UI for agent tool calls
- **Thread Management**: Persistent chat threads with history
- **Modern UI**: Clean, responsive design matching the original Flask UI
- **Dark Mode Support**: Automatic dark mode based on system preferences
- **Generative UI Ready**: Built for dynamic component updates based on tool calls

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Socket.IO** for real-time communication
- **React Router** for navigation
- **Lucide React** for icons
- **Marked** for markdown rendering
- **WebRTC** for voice recording

## Project Structure

```
src/
├── components/          # React components
│   ├── Chat.tsx        # Main chat interface
│   ├── Message.tsx     # Individual message component
│   ├── ChatInput.tsx   # Input field with voice support
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── SettingsModal.tsx # Settings configuration
│   ├── Toast.tsx       # Notification system
│   └── TypingIndicator.tsx # Typing animation
├── hooks/              # Custom React hooks
│   ├── useWebSocket.ts # WebSocket connection management
│   ├── useVoice.ts    # Voice interaction
│   └── useToast.ts    # Toast notifications
├── services/           # External services
│   ├── api.ts         # REST API calls
│   └── websocket.ts   # WebSocket service
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx            # Main application component
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- The backend Flask server running on `http://localhost:5001`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your backend URL if different:
```bash
REACT_APP_API_URL=http://localhost:5001
REACT_APP_WEBSOCKET_URL=http://localhost:5001
```

### Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `build/` directory.

## Configuration

The application can be configured through environment variables:

- `REACT_APP_API_URL`: Backend API base URL
- `REACT_APP_WEBSOCKET_URL`: WebSocket server URL  
- `REACT_APP_ENV`: Environment (development/production)

## API Integration

The frontend communicates with the Flask backend through:

### REST Endpoints
- `GET /api/info` - Agent and model information
- `GET /api/history/:threadId` - Chat history
- `POST /api/feedback` - Message feedback
- `POST /api/transcribe` - Audio transcription
- `POST /api/text-to-speech` - Speech synthesis

### WebSocket Events
- `send_message` - Send chat message
- `message_response` - Receive AI response
- `stream_token` - Streaming response tokens
- `message_chunk` - Message updates during streaming
- `stream_complete` - End of streaming response

## Browser Support

- Chrome/Chromium 88+
- Firefox 85+
- Safari 14+
- Edge 88+

Note: Voice features require HTTPS in production due to WebRTC security requirements.