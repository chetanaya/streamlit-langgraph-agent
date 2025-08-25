# React Frontend - AI Agent Chat Interface

A modern React-based chat interface for the LangGraph AI Agent Platform, featuring advanced voice interaction, real-time streaming, and comprehensive agent management capabilities.

## ✨ Features

- **🎨 Modern UI/UX**: Built with React 19, TypeScript, and Tailwind CSS
- **🎤 Advanced Voice Features**: 
  - Speech-to-text with OpenAI Whisper
  - Text-to-speech with multiple voice options
  - ML-based voice activity detection (always-on mode)
  - Smart audio feedback prevention
- **💬 Real-time Chat**: WebSocket-based streaming for instant responses
- **🔧 Agent Management**: Dynamic agent and model switching
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🎵 Audio Controls**: Play/pause controls for AI responses
- **🔗 Chat Sharing**: Share and load conversations via URLs
- **⚙️ Settings Management**: Comprehensive configuration options
- **🚫 Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend services running (Agent service on port 8080, optionally Flask on port 5001)

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   
   Visit `http://localhost:3000` to access the chat interface.

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## 🏗️ Architecture

### Component Structure

```
src/
├── components/           # React components
│   ├── Chat.tsx         # Main chat interface
│   ├── Message.tsx      # Individual message display
│   ├── ChatInput.tsx    # Message input with voice
│   ├── Sidebar.tsx      # Navigation and chat management
│   ├── SettingsModal.tsx # Configuration modal
│   ├── ShareModal.tsx   # Chat sharing functionality
│   ├── LoadModal.tsx    # Chat loading functionality
│   ├── Toast.tsx        # Notification system
│   └── TypingIndicator.tsx # Loading animation
├── hooks/               # Custom React hooks
│   ├── useVoice.ts     # Voice recording/playback
│   ├── useAlwaysOnVoice.ts # Voice activity detection
│   ├── useWebSocket.ts # Real-time communication
│   └── useToast.ts     # Toast notifications
├── services/           # API communication
│   ├── api.ts         # HTTP API client
│   └── websocket.ts   # WebSocket client
├── types/             # TypeScript definitions
│   └── index.ts       # Shared type definitions
├── utils/             # Utility functions
└── App.tsx            # Root application component
```

### Key Technologies

- **React 19**: Latest React with improved performance and features
- **TypeScript**: Full type safety and better developer experience  
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Socket.IO Client**: Real-time WebSocket communication
- **React Router**: Client-side routing for multi-page functionality
- **Lucide React**: Modern icon library
- **Marked**: Markdown parsing for message formatting

## 🎤 Voice Features

### Core Capabilities

- **Speech Recognition**: Real-time audio transcription using OpenAI Whisper
- **Speech Synthesis**: High-quality text-to-speech with 6 voice options
- **Voice Activity Detection**: ML-powered speech detection for hands-free interaction
- **Audio Management**: Automatic feedback prevention during AI speech playback

### Voice Interaction Modes

#### Manual Recording
```typescript
// Click microphone button to start/stop recording
const { toggleRecording, isRecording } = useVoice({
  onTranscription: (text) => handleSendMessage(text),
  onError: (error) => showError(error)
});
```

#### Always-On Detection
```typescript
// Automatically detect speech and start recording
const { isListening } = useAlwaysOnVoice({
  enabled: settings.alwaysOnVoice,
  onSpeechStart: () => startRecording(),
  onSpeechEnd: () => stopRecording()
});
```

### Implementation Details

- **Audio Format**: WebM recording with automatic conversion
- **Sample Rate**: 16kHz for optimal transcription accuracy
- **Error Handling**: Comprehensive error handling with user feedback
- **Permissions**: Graceful microphone permission handling
- **Security**: Temporary file management with automatic cleanup

## 💬 Real-time Communication

### WebSocket Integration

The frontend uses Socket.IO for real-time communication with the backend:

```typescript
const { sendMessage, isConnected } = useWebSocket({
  onMessage: (message) => addMessage(message),
  onStreamToken: (token) => updateStreamingMessage(token),
  onError: (error) => showError(error)
});
```

### Message Types

- **Human Messages**: User input (text or voice transcription)
- **AI Messages**: Agent responses with markdown support
- **Tool Calls**: Interactive tool execution with expandable results
- **System Messages**: Status updates and error notifications

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=http://localhost:8080
```

### Settings Management

The application includes comprehensive settings management:

- **Model Selection**: Choose from available LLM models
- **Agent Configuration**: Select and configure AI agents
- **Voice Settings**: 
  - Enable/disable voice features
  - Choose TTS voice (alloy, echo, fable, onyx, nova, shimmer)
  - Toggle always-on voice detection
- **UI Preferences**: Theme and display options

## 🧩 Component Details

### Message Component (`Message.tsx`)

Features:
- Markdown rendering for AI responses
- Expandable tool call visualization
- Integrated audio playback controls
- Star rating for feedback collection
- Accessibility-compliant markup

### ChatInput Component (`ChatInput.tsx`)

Features:
- Multi-line text input with auto-resize
- Voice recording button with visual feedback
- Always-on voice detection integration
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### Voice Hooks

#### `useVoice.ts`
- Manual voice recording control
- Audio transcription and playback
- Error handling and user feedback

#### `useAlwaysOnVoice.ts`  
- ML-based voice activity detection
- Automatic recording start/stop
- Noise suppression and echo cancellation

## 📱 Responsive Design

The interface is fully responsive and optimized for:

- **Desktop**: Full feature set with sidebar navigation
- **Tablet**: Adaptive layout with collapsible sidebar  
- **Mobile**: Touch-optimized interface with hamburger menu
- **Accessibility**: Screen reader support and keyboard navigation

## 🔧 Development

### Available Scripts

- `npm start`: Start development server
- `npm test`: Run test suite
- `npm run build`: Build for production
- `npm run eject`: Eject from Create React App (irreversible)

### Code Style

The project follows these conventions:

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React-specific rules
- **Prettier**: Automatic code formatting
- **Component Structure**: Functional components with hooks
- **State Management**: React hooks for local state, context for global state

### Testing

```bash
npm test
```

Tests are written using:
- **Jest**: Test framework
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Static Hosting

The built application can be deployed to any static hosting service:

- **Vercel**: Automatic deployments from Git
- **Netlify**: Continuous deployment with form handling
- **AWS S3 + CloudFront**: Scalable static hosting
- **GitHub Pages**: Free hosting for public repositories

### Docker Deployment

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🤝 Contributing

1. Follow the existing code style and conventions
2. Add TypeScript types for all new components and functions
3. Include tests for new features
4. Update documentation as needed
5. Ensure accessibility compliance

## 📄 License

This project is part of the LangGraph AI Agent Platform and follows the same MIT license.

---

**Built with ❤️ using React, TypeScript, and modern web technologies.**