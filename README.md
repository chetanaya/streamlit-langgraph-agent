# 🧰 LangGraph AI Agent Platform

A comprehensive platform for building sophisticated AI agentic workflows using **LangGraph** with both **Flask** and **React** interfaces. This project provides a complete foundation for creating custom AI agents with advanced voice interaction, streaming responses, tool integration, and persistent conversation history.

## ✨ Features

- **🤖 Multi-Model Support**: Compatible with OpenAI, Anthropic, Google, Groq, AWS Bedrock, Azure OpenAI, and Ollama
- **🎤 Advanced Voice Interaction**: Complete voice-enabled chat with speech-to-text, text-to-speech, and intelligent voice activity detection
- **🧠 ML-Based Voice Activity Detection**: Production-ready VAD using Silero VAD model with always-on voice detection
- **🔧 Example Banking Assistant**: Reference implementation showing how to build domain-specific agents with tools
- **💬 Real-time Streaming**: Live streaming responses for better user experience with Socket.IO integration
- **🔄 Persistent Memory**: Conversation history with thread-based persistence using SQLite or PostgreSQL
- **⚡ Tool Integration**: Extensible tool system for custom functionality
- **🎨 Modern Dual Interface**: 
  - **Flask Backend**: Traditional server-rendered chat interface with Socket.IO
  - **React Frontend**: Modern SPA with TypeScript, Tailwind CSS, and real-time WebSocket communication
- **📊 Feedback System**: Built-in user feedback collection with LangSmith integration
- **🔐 Authentication**: Optional HTTP bearer token authentication
- **🌐 Multi-Provider**: Support for multiple LLM providers with easy switching
- **🎵 Audio Processing**: Real-time audio transcription and speech synthesis with OpenAI Whisper and TTS

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- At least one LLM API key (OpenAI, Anthropic, etc.)
- **OpenAI API key required for voice features** (Whisper STT and TTS)
- Modern web browser with microphone support for voice interaction

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd streamlit-langgraph-agent
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:

   ```env
   # Choose at least one provider
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   GOOGLE_API_KEY=your_google_key_here
   
   # Optional: Set default model
   DEFAULT_MODEL=gpt-4o-mini
   
   # Server configuration
   HOST=0.0.0.0
   PORT=8080
   ```

4. **Run the application**

   This repository has three cooperating services:
   - **Agent service (FastAPI)** — serves the agent API and stream endpoints (default: port 8080)
   - **Flask Frontend** — traditional chat UI with server-side rendering (default: port 5001)
   - **React Frontend** — modern SPA with advanced features (default: port 3000)

   Start the agent service (FastAPI) with the included runner:

   ```bash
   # from repository root
   # using the helper runner which calls uvicorn for `service:app`
   python src/run_service.py
   ```

   Or run uvicorn directly:

   ```bash
   python -m uvicorn service:app --host 0.0.0.0 --port 8080
   ```

   **Option A: Flask Frontend (Traditional)**
   
   In another terminal, start the Flask frontend:

   ```bash
   # start the Flask chat frontend (uses Flask-SocketIO)
   python src/flask_app.py
   ```

   **Option B: React Frontend (Modern SPA)**
   
   In another terminal, start the React development server:

   ```bash
   cd frontend
   npm install
   npm start
   ```

5. **Open your browser**

   - Agent service health & API: `http://localhost:8080` (health endpoint: `/health`)
   - Flask chat UI: `http://localhost:5001`
   - React chat UI: `http://localhost:3000` (recommended for full features)

## 🎤 Voice Features

This application includes a comprehensive voice interaction system that enables natural conversation with AI assistants through speech.

### Core Voice Capabilities

- **🎙️ Speech-to-Text**: Real-time audio transcription using OpenAI Whisper
- **🔊 Text-to-Speech**: High-quality speech synthesis with multiple voice options (alloy, echo, fable, onyx, nova, shimmer)
- **🧠 Smart Voice Activity Detection**: ML-powered VAD using Silero VAD model for accurate speech detection
- **🔄 Always-On Voice Mode**: Hands-free interaction with automatic speech detection and recording
- **🎵 Audio Playback**: Integrated audio player for AI responses with playback controls
- **🚫 Feedback Prevention**: Intelligent audio management to prevent microphone feedback during AI speech

### Voice Interaction Modes

#### Manual Voice Input
- Click the microphone button to start/stop recording
- Visual feedback with recording indicators
- Automatic transcription and message sending

#### Always-On Voice Detection
- Enable in Settings → "Always-on voice detection"
- Automatically detects when you start speaking
- Records speech and stops after natural pauses
- Requires microphone permissions

### Voice Settings

- **Voice Interaction Toggle**: Enable/disable all voice features
- **Always-On Detection**: Toggle hands-free voice activation
- **Voice Selection**: Choose from 6 different AI voices for responses
- **Audio Quality**: Optimized for real-time processing with 16kHz sampling

### Technical Implementation

- **VAD Model**: Silero VAD (Voice Activity Detection) for production-ready speech detection
- **Audio Format**: WebM recording with WAV conversion for transcription
- **Streaming**: Real-time audio processing with Socket.IO integration
- **Error Handling**: Comprehensive error handling for audio processing failures
- **Security**: Temporary file management with automatic cleanup

## 🏗️ Architecture

### Core Components

#### Backend Services
- **`src/flask_app.py`**: Flask chat interface with Socket.IO streaming support and voice endpoints
- **`src/service/`**: FastAPI agent service with endpoints implemented in `service.py` (entrypoint `service:app`)
- **`src/run_service.py`**: Helper to run the FastAPI agent service (uvicorn runner)
- **`src/agents/`**: Agent definitions and tool implementations
  - **`banking/`**: Banking assistant with specialized tools
  - **`agents.py`**: Agent registry and configuration
- **`src/client/`**: Agent client for API communication
- **`src/core/`**: Core settings and LLM configuration
- **`src/schema/`**: Data models and type definitions

#### React Frontend (Modern SPA)
- **`frontend/src/components/`**: React components
  - **`Chat.tsx`**: Main chat interface with real-time messaging
  - **`Message.tsx`**: Message component with voice playback and tool call visualization
  - **`ChatInput.tsx`**: Input component with voice recording and always-on detection
  - **`SettingsModal.tsx`**: Settings management with voice and model configuration
  - **`ShareModal.tsx`** & **`LoadModal.tsx`**: Chat sharing and loading functionality
- **`frontend/src/hooks/`**: Custom React hooks
  - **`useVoice.ts`**: Voice recording and playback management
  - **`useAlwaysOnVoice.ts`**: ML-based voice activity detection
  - **`useWebSocket.ts`**: Real-time communication with backend
- **`frontend/src/services/`**: API communication layer
- **`frontend/src/types/`**: TypeScript type definitions

#### Flask Frontend (Legacy)
- **`src/static/js/`**: Frontend JavaScript with voice interaction logic
  - **`app.js`**: Main application logic with voice controls and Socket.IO integration
  - **`ml-vad.js`**: ML-based Voice Activity Detection using Silero VAD model
- **`src/static/css/style.css`**: UI styling including voice interface components
- **`src/templates/index.html`**: HTML template with voice controls and audio elements

### Agent System

The application uses a modular agent system built on LangGraph. The included **Banking Assistant serves as a reference example** showing how to:

```python
# Example Banking Assistant Tools (for reference)
- Authentication tools (login, logout, session management)
- Account tools (balance, details, statements)
- Transaction tools (transfers, payments, history)
- Support tools (tickets, FAQ, contact)
```

**This is just one example** - you can easily replace or extend with your own domain-specific agents and tools.

## Service & Flask API (short reference)

This project exposes two sets of endpoints: the agent service (FastAPI) and the Flask frontend/api. Key endpoints:

Agent service (FastAPI, default port 8080)

- GET `/info` — list available agents and models

- POST `/invoke` or POST `/{agent_id}/invoke` — invoke an agent for a final response

- POST `/stream` or POST `/{agent_id}/stream` — SSE stream of tokens / messages (`text/event-stream`)

- POST `/feedback` — submit run feedback (LangSmith)

- POST `/history` — retrieve saved conversation history

- GET `/health` — health check

Flask frontend API (default port 5001)

- GET `/` — main chat UI (renders `templates/index.html`)
- GET `/api/info` — proxy to agent service `/info`
- GET `/api/history/<thread_id>` — fetch thread history for a conversation
- POST `/api/feedback` — proxy to agent service feedback

React frontend (default port 3000)

- Built as a modern SPA that communicates directly with the FastAPI service
- Real-time WebSocket communication for streaming responses
- Advanced voice features with ML-based voice activity detection
- TypeScript for type safety and better development experience
- Tailwind CSS for responsive, modern UI design

**Voice Endpoints:**

- POST `/api/transcribe` — upload audio file to transcribe using OpenAI Whisper
  - Accepts: `multipart/form-data` with `audio` file (WebM, WAV, MP3, etc.)
  - Max file size: 25MB
  - Returns: `{"success": true, "text": "transcribed text"}`
  - Error handling: Invalid format, file size, empty audio, API errors

- POST `/api/text-to-speech` — convert text to speech using OpenAI TTS
  - Accepts: `{"text": "string", "voice": "alloy|echo|fable|onyx|nova|shimmer"}`
  - Max text length: 4096 characters
  - Returns: MP3 audio file stream
  - Voice options: alloy (default), echo, fable, onyx, nova, shimmer

WebSocket events (Socket.IO)

- Client emits `send_message` with payload { message, model, thread_id, use_streaming, agent }

- Server emits `stream_token`, `message_chunk`, `message_response`, `stream_complete`, and `error` events

**Real-time Voice Integration:**
- Voice messages are processed through the same Socket.IO pipeline
- Audio transcription happens client-side before sending via `message` event
- TTS responses are generated server-side and streamed back
- Voice activity detection runs independently in the browser
- Always-on mode uses ML-based VAD for seamless voice activation

Notes:

- The Flask frontend uses the `AGENT_URL` env var (if set) to locate the agent service; otherwise it defaults to `http://{HOST}:{PORT}` from your `.env`.

- Socket.IO is used to stream tokens and message chunks from the agent to the browser in real-time.

## Repository scan — notable files & notes

I scanned the codebase and collected a short map of important files and a few caveats you should know about.

- Frontend
  - `src/flask_app.py` — Flask + Flask-SocketIO frontend. Runs on `0.0.0.0:5001` by default (socketio.run(..., port=5001)). Uses `SECRET_KEY` for `session` and `AGENT_URL` to locate the agent API.
  - UI assets: `src/templates/index.html`, `src/static/js/app.js`, `src/static/css/style.css`.

- Agent service (API)
  - `src/service/service.py` — FastAPI implementation; the app is exposed as `service:app` (uvicorn entrypoint).
  - Runner: `src/run_service.py` — convenience script that calls uvicorn with the correct settings and auto-reload when in dev mode.

- Client & wiring
  - `src/client/client.py` — AgentClient used by the Flask frontend to communicate with the agent service.
  - `src/agents/` — agent graphs, tools, and example banking assistant.

- Data & memory
  - Sample data for the banking assistant: `src/data/banking/*.csv` (accounts, customers, transactions, etc.)
  - Checkpoint DB (SQLite) default file shown in `.env.example` is `checkpoints.db`.

- Dev / infra
  - `requirements.txt` — lists Python dependencies. Note: it currently contains both `streamlit` and `flask` entries.
  - `.env.example` — all environment variables used across app and service; `AGENT_URL` comment updated to reference the Flask app.
  - `.gitignore` contains Streamlit-related ignore rules.

Important caveat — Streamlit remnants

- The repository README has been updated to document Flask, but the codebase still contains a few Streamlit remnants:
  - `src/schema/task_data.py` imports `streamlit as st` and uses Streamlit APIs for task status rendering.
  - `requirements.txt` currently lists `streamlit` (twice). `.gitignore` also references `.streamlit`.

If your branch intentionally migrated the UI to Flask, consider these small follow-ups to fully remove Streamlit from the project:

1. Remove `streamlit` entries from `requirements.txt` (or keep them if you still need Streamlit for a specific tool).
2. Replace or guard `streamlit` usage in `src/schema/task_data.py` (wrap with try/except or convert to a CLI/HTML based status reporter).
3. Clean `.gitignore` if you are no longer using the `.streamlit` directory.

These changes are optional and can be done on a separate branch if you want a clean migration.

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required for voice features) | Yes* | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | No* | - |
| `GOOGLE_API_KEY` | Google AI API key | No* | - |
| `GROQ_API_KEY` | Groq API key | No* | - |
| `DEFAULT_MODEL` | Default LLM model | No | Auto-detected |
| `HOST` | Server host | No | `0.0.0.0` |
| `PORT` | Server port | No | `8080` |
| `DATABASE_TYPE` | Database type (`sqlite`/`postgres`) | No | `sqlite` |
| `AUTH_SECRET` | Authentication secret | No | - |
| `AGENT_URL` | Base URL for agent service (Flask frontend) | No | `http://{HOST}:{PORT}` |
| `SECRET_KEY` | Flask secret key for sessions | No | Auto-generated |

*At least one LLM provider API key is required. **OpenAI API key is required for voice features** (Whisper STT and TTS).

Important env vars used by the Flask frontend/proxy:

- `AGENT_URL` — base URL for the agent service the Flask app will call (defaults to `http://{HOST}:{PORT}`)

- `SECRET_KEY` — Flask secret key (used by `session`), default provided in `flask_app.py` if unset

### Database Configuration

#### SQLite (Default)

```env
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=checkpoints.db
```

#### PostgreSQL

```env
DATABASE_TYPE=postgres
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=langgraph_db
```

### LangSmith Integration (Optional)

```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=your_project_name
```

## 🔧 Usage

### Basic Chat

#### React Frontend (Recommended)
1. Open `http://localhost:3000` after running `npm start` in the frontend directory
2. Use the modern interface with full voice features and real-time streaming
3. Access settings via the gear icon to configure models, agents, and voice options

#### Flask Frontend (Traditional)  
1. Open `http://localhost:5001` after running the Flask server
2. Select your preferred model from the sidebar
3. Choose an agent (example: Banking Assistant - replace with your own)
4. Start chatting with the AI assistant

### Voice Interaction

#### Manual Voice Input
1. Click the microphone button (🎤) next to the text input
2. Speak your message clearly
3. Click the microphone button again to stop recording
4. Your speech will be automatically transcribed and sent

#### Always-On Voice Mode
1. Open Settings (⚙️) in the sidebar
2. Enable "Always-on voice detection"
3. Grant microphone permissions when prompted
4. Simply start speaking - the system will automatically:
   - Detect when you begin speaking
   - Start recording your voice
   - Stop recording after you finish (natural pause detection)
   - Transcribe and send your message

#### Voice Responses
1. Enable "Voice interaction" in Settings
2. AI responses will be automatically converted to speech
3. Use the audio player controls to play/pause responses
4. Choose from 6 different AI voices in the TTS settings

#### Voice Settings
- **Voice Interaction**: Toggle all voice features on/off
- **Always-On Detection**: Enable hands-free voice activation
- **Voice Selection**: Choose AI voice (alloy, echo, fable, onyx, nova, shimmer)
- **Microphone Permissions**: Required for voice input features

### Example Banking Assistant Features

The **example** banking assistant demonstrates:

- **Account Management**: Check balances, view account details
- **Transactions**: Transfer money, view transaction history
- **Authentication**: Secure login/logout processes
- **Support**: Create tickets, access FAQ, get help

**Note**: This is a reference implementation. Replace with your own domain-specific tools and workflows.

### Sharing Conversations

- Click "Share/resume chat" in the sidebar
- Copy the generated URL to share or bookmark conversations
- Use thread IDs to resume previous conversations

### Model Switching

- Use the Settings panel in the sidebar
- Switch between available models in real-time
- Toggle streaming responses on/off

## 🛠️ Development

### Building Your Own Agents

**Replace the example banking assistant** with your own domain-specific agents:

1. Create a new agent module in `src/agents/`
2. Define your agent's tools and graph
3. Register the agent in `src/agents/agents.py`

```python
# Example: src/agents/my_agent.py
from langgraph import StateGraph
from agents.utils import create_agent

def my_custom_agent():
    # Define your agent logic
    pass

# Register in agents.py
agents["my-agent"] = Agent(
    description="My custom agent",
    graph=my_custom_agent,
)
```

**The banking assistant is just a starting point** - customize it for your specific use case.

### Adding New Tools

1. Create tool functions with proper type hints
2. Add them to your agent's tool list
3. Tools automatically appear in the chat interface

```python
from langchain_core.tools import tool

@tool
def my_custom_tool(query: str) -> str:
    """My custom tool description."""
    return f"Processed: {query}"
```

### Running in Development Mode

```bash
# Enable auto-reload
MODE=dev python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
```

## 🐳 Docker Deployment

```dockerfile
# Dockerfile example
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src/ ./src/
COPY .env .

EXPOSE 8080

# Start the agent server and Flask app
CMD ["sh", "-c", "python -m uvicorn src.main:app --host 0.0.0.0 --port 8080 & python src/flask_app.py"]
```

## 🔒 Security

- **API Keys**: Store in environment variables, never commit to version control
- **Authentication**: Optional HTTP bearer token authentication
- **HTTPS**: Recommended for production deployments
- **Database**: Use PostgreSQL with proper credentials for production

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

#### Connection Error

- Ensure the agent server is running on the correct port
- Check firewall settings
- Verify environment variables

#### Model Not Available

- Confirm API key is valid
- Check model name spelling
- Ensure provider is properly configured

#### Database Issues

- For PostgreSQL: Verify connection parameters
- For SQLite: Check file permissions
- Ensure database directory exists

### Logs

Check application logs for detailed error information:

```bash
# Server logs
python -m uvicorn src.main:app --log-level debug

# Flask logs
python src/flask_app.py --logger.level debug
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the code comments and docstrings
- **Community**: Join discussions in the project repository

---

**Built with ❤️ using LangGraph, Flask, and modern AI technologies.**
