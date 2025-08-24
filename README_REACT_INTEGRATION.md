# React Frontend Integration with FastAPI Backend

This document explains how to run the integrated system with the React frontend and FastAPI backend.

## Overview

The system now consists of:
- **Backend**: FastAPI service (`run_service.py`) with WebSocket support
- **Frontend**: React TypeScript application with real-time chat interface

## Prerequisites

1. **Python Environment**: Ensure you have Python 3.10+ with all dependencies installed
2. **Node.js**: Node.js 16+ for the React frontend
3. **API Keys**: OpenAI API key for voice features (optional)

## Backend Setup (FastAPI)

### 1. Install Dependencies

```bash
cd src
pip install -r ../requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the `src/` directory:

```bash
# Required for agent functionality
LANGSMITH_API_KEY=your_langsmith_key
DEFAULT_MODEL=gpt-4o-mini

# Optional for voice features
OPENAI_API_KEY=your_openai_key

# Database (optional - uses SQLite by default)
POSTGRES_URI=postgresql://user:pass@localhost/db

# Authentication (optional)
AUTH_SECRET=your_auth_secret

# Server configuration
HOST=0.0.0.0
PORT=8080
```

### 3. Run the FastAPI Server

```bash
cd src
python run_service.py
```

The server will start at `http://localhost:8080` with:
- REST API endpoints at `/info`, `/history`, `/feedback`, etc.
- WebSocket support for real-time chat
- Audio transcription at `/transcribe`
- Text-to-speech at `/text-to-speech`

## Frontend Setup (React)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Configuration

The frontend `.env` file should point to your FastAPI backend:

```bash
# React App Configuration
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WEBSOCKET_URL=http://localhost:8080

# Development
REACT_APP_ENV=development
```

### 3. Run the React Development Server

```bash
cd frontend
npm start
```

The React app will start at `http://localhost:3000`.

## API Endpoints

### FastAPI Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/info` | Get available agents and models |
| POST | `/history` | Get chat history for a thread |
| POST | `/feedback` | Submit feedback for a message |
| POST | `/transcribe` | Transcribe audio to text |
| POST | `/text-to-speech` | Convert text to speech |
| POST | `/stream` | Stream agent responses |
| POST | `/invoke` | Get single agent response |
| WebSocket | `/socket.io/` | Real-time chat communication |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Client connection established |
| `send_message` | Client → Server | Send chat message |
| `message_response` | Server → Client | Non-streaming message response |
| `stream_token` | Server → Client | Streaming token |
| `message_chunk` | Server → Client | Streaming message chunk |
| `stream_complete` | Server → Client | Streaming complete |
| `error` | Server → Client | Error message |

## Features

### ✅ Implemented Features

- **Real-time Chat**: WebSocket-based communication with streaming responses
- **Agent Selection**: Choose from available agents and models
- **Voice Input**: Audio recording and transcription (requires OpenAI API key)
- **Voice Output**: Text-to-speech conversion (requires OpenAI API key)
- **Tool Visualization**: Expandable display of agent tool calls
- **Thread Management**: Persistent conversation threads
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Comprehensive error handling and user feedback

### 🎯 Future Enhancements

- **Generative UI**: Dynamic component generation based on tool calls
- **File Upload**: Support for file attachments
- **Theme Customization**: User-selectable themes
- **Advanced Voice**: Always-on voice detection
- **Chat Export**: Export conversations

## Architecture

### Backend Architecture

```
FastAPI App
├── REST API Routes (/info, /history, etc.)
├── WebSocket Handler (Socket.IO)
├── LangGraph Agent Integration
├── OpenAI Audio Services
└── Database Storage (SQLite/PostgreSQL)
```

### Frontend Architecture

```
React App
├── Components (Chat, Message, Sidebar, etc.)
├── Services (API, WebSocket)
├── Hooks (useWebSocket, useVoice, useToast)
├── Types (TypeScript definitions)
└── Utils (Helper functions)
```

### Data Flow

1. **User Input**: User types/speaks message in React frontend
2. **WebSocket**: Message sent to FastAPI via WebSocket
3. **Agent Processing**: LangGraph agent processes the message
4. **Streaming Response**: Agent streams response back via WebSocket
5. **UI Update**: React frontend updates in real-time

## Development

### Backend Development

```bash
cd src
python run_service.py
# Server auto-reloads on file changes
```

### Frontend Development

```bash
cd frontend
npm start
# React app auto-reloads on file changes
```

### Testing

**Test Backend Health**:
```bash
curl http://localhost:8080/health
```

**Test Agent Info**:
```bash
curl http://localhost:8080/info
```

**Test Frontend Build**:
```bash
cd frontend
npm run build
```

## Troubleshooting

### Common Issues

1. **Backend Import Errors**: Ensure all Python dependencies are installed
2. **CORS Issues**: Check CORS configuration in FastAPI service
3. **WebSocket Connection Failed**: Verify WebSocket URL in frontend .env
4. **Voice Features Not Working**: Ensure OpenAI API key is set
5. **Database Errors**: Check database configuration and permissions

### Debug Mode

**Backend Debugging**:
- Set `LANGSMITH_TRACING=true` for detailed agent tracing
- Check server logs for WebSocket connection issues

**Frontend Debugging**:
- Open browser DevTools to check WebSocket connection
- Monitor Network tab for API call issues
- Check Console for JavaScript errors

## Production Deployment

### Backend Deployment

```bash
# Using Docker
FROM python:3.11-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "src/run_service.py"]
```

### Frontend Deployment

```bash
cd frontend
npm run build
# Deploy build/ directory to static hosting
```

### Environment Variables for Production

- Set `REACT_APP_API_URL` to your production API URL
- Configure HTTPS for WebSocket connections
- Set proper CORS origins in FastAPI
- Use production database (PostgreSQL recommended)

## Performance Considerations

- **WebSocket Scaling**: Consider using Redis for multi-instance deployments
- **Database**: Use PostgreSQL for production workloads
- **Caching**: Implement Redis caching for frequently accessed data
- **CDN**: Use CDN for React frontend static assets

## Security

- **Authentication**: Implement proper authentication for production
- **CORS**: Restrict CORS origins to your domain
- **Rate Limiting**: Add rate limiting to API endpoints  
- **Input Validation**: All user inputs are validated server-side
- **Environment Variables**: Never commit API keys to version control

---

The integrated system provides a modern, real-time chat interface with comprehensive agent capabilities and voice features, ready for both development and production use.