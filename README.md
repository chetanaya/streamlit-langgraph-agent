# 🧰 LangGraph Flask Agent Boilerplate

A **baseline/boilerplate** for building sophisticated AI agentic workflows using **LangGraph** with a **Flask** chat interface. This project provides a complete foundation for creating custom AI agents with streaming responses, tool integration, and persistent conversation history.

## ✨ Features

- **🤖 Multi-Model Support**: Compatible with OpenAI, Anthropic, Google, Groq, AWS Bedrock, Azure OpenAI, and Ollama

- **🔧 Example Banking Assistant**: Reference implementation showing how to build domain-specific agents with tools
- **💬 Real-time Streaming**: Live streaming responses for better user experience
- **🔄 Persistent Memory**: Conversation history with thread-based persistence using SQLite or PostgreSQL
- **⚡ Tool Integration**: Extensible tool system for custom functionality
- **🎨 Modern UI**: Clean, responsive Flask interface with chat functionality
- **📊 Feedback System**: Built-in user feedback collection with LangSmith integration
- **🔐 Authentication**: Optional HTTP bearer token authentication
- **🌐 Multi-Provider**: Support for multiple LLM providers with easy switching

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- At least one LLM API key (OpenAI, Anthropic, etc.)

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

   This repository has two cooperating services:
   - Agent service (FastAPI) — serves the agent API and stream endpoints (default: port 8080)
   - Frontend (Flask + Socket.IO) — provides the chat UI and client-side websockets (default: port 5001)

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

   In another terminal, start the Flask frontend:

   ```bash
   # start the chat frontend (uses Flask-SocketIO)
   python src/flask_app.py
   ```

5. **Open your browser**

   - Agent service health & API: `http://localhost:8080` (health endpoint: `/health`)

   - Flask chat UI (default Socket.IO port): `http://localhost:5001`

## 🏗️ Architecture

### Core Components

- **`src/flask_app.py`**: Main Flask chat interface with Socket.IO streaming support
- **`src/service/`**: FastAPI agent service with endpoints implemented in `service.py` (entrypoint `service:app`)
- **`src/run_service.py`**: Helper to run the FastAPI agent service (uvicorn runner)
- **`src/agents/`**: Agent definitions and tool implementations
  - **`banking/`**: Banking assistant with specialized tools
  - **`agents.py`**: Agent registry and configuration
- **`src/client/`**: Agent client for API communication
- **`src/core/`**: Core settings and LLM configuration
- **`src/schema/`**: Data models and type definitions

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

- POST `/api/transcribe` — upload audio file to transcribe (OpenAI Whisper)

- POST `/api/text-to-speech` — convert text to speech (OpenAI TTS)

WebSocket events (Socket.IO)

- Client emits `send_message` with payload { message, model, thread_id, use_streaming, agent }

- Server emits `stream_token`, `message_chunk`, `message_response`, `stream_complete`, and `error` events

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
| `OPENAI_API_KEY` | OpenAI API key | No* | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | No* | - |
| `GOOGLE_API_KEY` | Google AI API key | No* | - |
| `GROQ_API_KEY` | Groq API key | No* | - |
| `DEFAULT_MODEL` | Default LLM model | No | Auto-detected |
| `HOST` | Server host | No | `0.0.0.0` |
| `PORT` | Server port | No | `8080` |
| `DATABASE_TYPE` | Database type (`sqlite`/`postgres`) | No | `sqlite` |
| `AUTH_SECRET` | Authentication secret | No | - |

*At least one LLM provider API key is required.

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

1. Open the Flask interface
2. Select your preferred model from the sidebar
3. Choose an agent (example: Banking Assistant - replace with your own)
4. Start chatting with the AI assistant

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
