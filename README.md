

# 🧰 LangGraph Streamlit Agent Boilerplate

A **baseline/boilerplate** for building sophisticated AI agentic workflows using **LangGraph** with a **Streamlit** chat interface. This project provides a complete foundation for creating custom AI agents with streaming responses, tool integration, and persistent conversation history.

## ✨ Features

- **🤖 Multi-Model Support**: Compatible with OpenAI, Anthropic, Google, Groq, AWS Bedrock, Azure OpenAI, and Ollama
- **🔧 Example Banking Assistant**: Reference implementation showing how to build domain-specific agents with tools
- **💬 Real-time Streaming**: Live streaming responses for better user experience
- **🔄 Persistent Memory**: Conversation history with thread-based persistence using SQLite or PostgreSQL
- **⚡ Tool Integration**: Extensible tool system for custom functionality
- **🎨 Modern UI**: Clean, responsive Streamlit interface with chat functionality
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

   ```bash
   # Start the agent server
   python src/run_service.py
   
   # In another terminal, start the Streamlit app
   streamlit run src/streamlit_app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:8501` to access the chat interface.

## 🏗️ Architecture

### Core Components

- **`src/streamlit_app.py`**: Main Streamlit chat interface with streaming support
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

1. Open the Streamlit interface
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

EXPOSE 8080 8501

# Start both services
CMD ["sh", "-c", "python -m uvicorn src.main:app --host 0.0.0.0 --port 8080 & streamlit run src/streamlit_app.py --server.port 8501 --server.address 0.0.0.0"]
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

# Streamlit logs
streamlit run src/streamlit_app.py --logger.level debug
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the code comments and docstrings
- **Community**: Join discussions in the project repository

---

**Built with ❤️ using LangGraph, Streamlit, and modern AI technologies.**
