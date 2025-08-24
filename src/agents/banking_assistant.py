"""
Banking Customer Support Assistant

This module provides a Banking assistant to help customers with account management,
transactions, and support through natural language.
"""

from datetime import datetime
from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import (
    RunnableConfig,
    RunnableLambda,
    RunnableSerializable,
)
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.managed import RemainingSteps
from langgraph.prebuilt import ToolNode

from agents.banking.accounts import account_tools
from agents.banking.authentication import auth_tools
from agents.banking.transactions import transaction_tools
from agents.banking.support import support_tools
from agents.llama_guard import LlamaGuard, LlamaGuardOutput, SafetyAssessment
from core import get_model, settings


class AgentState(MessagesState, total=False):
    """State for the Banking assistant.

    `total=False` is PEP589 specs.
    documentation: https://typing.readthedocs.io/en/latest/spec/typeddict.html#totality
    """

    safety: LlamaGuardOutput
    remaining_steps: RemainingSteps


# Combine all Banking tools
tools = []

# Core banking tools for customer support
core_tools = []
core_tools.extend(auth_tools)
core_tools.extend(account_tools)
core_tools.extend(transaction_tools)
core_tools.extend(support_tools)

# Use core tools to stay under OpenAI's limit of 128
tools = core_tools

# Check the number of tools to ensure we're under the OpenAI limit of 128
if len(tools) > 120:
    import warnings

    warnings.warn(
        f"Banking assistant has {len(tools)} tools, approaching OpenAI's limit of 128. Consider further reducing the number of tools."
    )
    print(
        f"WARNING: Banking assistant has {len(tools)} tools, approaching OpenAI's limit of 128."
    )

current_date = datetime.now().strftime("%B %d, %Y")
instructions = f"""
You are a Banking Customer Support assistant. Provide concise, accurate banking assistance. Today's date: {current_date}.

CORE REQUIREMENTS:
- Authenticate customers before sharing account information
- Provide direct answers without unnecessary explanations
- Use tools efficiently to complete requests
- Never display full account numbers (use ****1234 format)

AUTHENTICATION REQUIRED: Customer ID + SSN last 4 + Date of Birth

RESPONSE STYLE:
- Be brief and factual
- Answer the specific question asked
- No extra context unless requested
- Use bullet points for multiple items
- Include only essential information

TOOL USAGE:
- authenticate_customer() - Required first step
- get_account_balance() - For balance inquiries
- get_transaction_history() - For transaction questions
- initiate_transfer() - For transfers
- create_support_ticket() - For issues requiring follow-up
- dispute_transaction() - For transaction disputes

SECURITY:
- Always authenticate first
- Mask sensitive data
- Log authentication attempts
- Never bypass security protocols
"""


def wrap_model(model: BaseChatModel) -> RunnableSerializable[AgentState, AIMessage]:
    bound_model = model.bind_tools(tools)
    preprocessor = RunnableLambda(
        lambda state: [SystemMessage(content=instructions)] + state["messages"],
        name="StateModifier",
    )
    return preprocessor | bound_model  # type: ignore[return-value]


def format_safety_message(safety: LlamaGuardOutput) -> AIMessage:
    content = f"This conversation was flagged for unsafe content: {', '.join(safety.unsafe_categories)}"
    return AIMessage(content=content)


async def acall_model(state: AgentState, config: RunnableConfig) -> AgentState:
    m = get_model(config["configurable"].get("model", settings.DEFAULT_MODEL))
    model_runnable = wrap_model(m)
    response = await model_runnable.ainvoke(state, config)

    # Run llama guard check here to avoid returning the message if it's unsafe
    llama_guard = LlamaGuard()
    safety_output = await llama_guard.ainvoke("Agent", state["messages"] + [response])
    if safety_output.safety_assessment == SafetyAssessment.UNSAFE:
        return {
            "messages": [format_safety_message(safety_output)],
            "safety": safety_output,
        }

    if state["remaining_steps"] < 2 and response.tool_calls:
        return {
            "messages": [
                AIMessage(
                    id=response.id,
                    content="Sorry, need more steps to process this request.",
                )
            ]
        }
    # We return a list, because this will get added to the existing list
    return {"messages": [response]}


async def llama_guard_input(state: AgentState, config: RunnableConfig) -> AgentState:
    llama_guard = LlamaGuard()
    safety_output = await llama_guard.ainvoke("User", state["messages"])
    return {"safety": safety_output, "messages": []}


async def block_unsafe_content(state: AgentState, config: RunnableConfig) -> AgentState:
    safety: LlamaGuardOutput = state["safety"]
    return {"messages": [format_safety_message(safety)]}


# Define the graph
agent = StateGraph(AgentState)
agent.add_node("model", acall_model)
agent.add_node("tools", ToolNode(tools))
agent.add_node("guard_input", llama_guard_input)
agent.add_node("block_unsafe_content", block_unsafe_content)
agent.set_entry_point("guard_input")


# Check for unsafe input and block further processing if found
def check_safety(state: AgentState) -> Literal["unsafe", "safe"]:
    safety: LlamaGuardOutput = state["safety"]
    match safety.safety_assessment:
        case SafetyAssessment.UNSAFE:
            return "unsafe"
        case _:
            return "safe"


agent.add_conditional_edges(
    "guard_input", check_safety, {"unsafe": "block_unsafe_content", "safe": "model"}
)

# Always END after blocking unsafe content
agent.add_edge("block_unsafe_content", END)

# Always run "model" after "tools"
agent.add_edge("tools", "model")


# After "model", if there are tool calls, run "tools". Otherwise END.
def pending_tool_calls(state: AgentState) -> Literal["tools", "done"]:
    last_message = state["messages"][-1]
    if not isinstance(last_message, AIMessage):
        raise TypeError(f"Expected AIMessage, got {type(last_message)}")
    if last_message.tool_calls:
        return "tools"
    return "done"


agent.add_conditional_edges(
    "model", pending_tool_calls, {"tools": "tools", "done": END}
)

banking_assistant = agent.compile(checkpointer=MemorySaver())
