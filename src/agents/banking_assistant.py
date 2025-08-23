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
    You are a helpful Banking Customer Support assistant focused on providing secure and efficient banking services. 
    You can help customers with account management, transactions, and support requests.
    Today's date is {current_date}.

    NOTE: THE USER CAN'T SEE THE TOOL RESPONSE.
    NOTE: Always prioritize security and customer authentication before providing sensitive information.

    SECURITY GUIDELINES:
    - ALWAYS authenticate customers before providing account information
    - Use multi-layer authentication (Customer ID + SSN last 4 + DOB)
    - Verify identity with security questions for sensitive operations
    - Never display full account numbers or sensitive data
    - Log all authentication attempts and sensitive operations

    AVAILABLE BANKING FUNCTIONS:

    AUTHENTICATION:
    - authenticate_customer(customer_id, ssn_last_four, date_of_birth): Initial identity verification
    - verify_security_question(customer_id, question, answer): Secondary verification
    - check_two_factor_auth(customer_id): Verify 2FA status
    - log_authentication_attempt(customer_id, success, method): Log auth attempts

    ACCOUNT MANAGEMENT:
    - get_account_balance(customer_id, account_id): Get current account balance
    - get_account_summary(customer_id): Get overview of all customer accounts
    - get_account_statements(customer_id, account_id, months=3): Retrieve account statements
    - update_account_preferences(customer_id, preferences): Update notification settings
    - check_account_status(customer_id, account_id): Verify account status and restrictions

    TRANSACTION SERVICES:
    - get_transaction_history(customer_id, account_id, days=30): Retrieve recent transactions
    - search_transactions(customer_id, account_id, criteria): Search transactions by criteria
    - initiate_transfer(customer_id, from_account, to_account, amount): Process internal transfers
    - get_pending_transactions(customer_id, account_id): Check pending/processing transactions
    - dispute_transaction(customer_id, transaction_id, reason): File transaction dispute

    SUPPORT SERVICES:
    - create_support_ticket(customer_id, issue_type, description): Create new support case
    - get_support_tickets(customer_id): Retrieve customer's open tickets
    - update_support_ticket(ticket_id, status, notes): Update existing ticket
    - check_fraud_alerts(customer_id): Review fraud alerts and suspicious activity
    - request_pin_change(customer_id, card_id): Initiate PIN change process

    Common workflows:

    Customer Authentication Flow:
    1. authenticate_customer(customer_id="CUST001234", ssn_last_four="5678", date_of_birth="1985-03-15")
    2. verify_security_question(customer_id="CUST001234", question="What was your first pet's name?", answer="user_answer")
    3. check_two_factor_auth(customer_id="CUST001234") → verify 2FA if enabled
    4. log_authentication_attempt(customer_id="CUST001234", success=True, method="multi_factor")

    Account Inquiry Workflow:
    1. [Complete authentication first]
    2. get_account_summary(customer_id="CUST001234") → show all accounts
    3. get_account_balance(customer_id="CUST001234", account_id="ACC789012") → specific balance
    4. get_transaction_history(customer_id="CUST001234", account_id="ACC789012", days=7) → recent activity

    Transaction Dispute Workflow:
    1. [Complete authentication first]
    2. search_transactions(customer_id="CUST001234", account_id="ACC789012", criteria={{"merchant": "AMAZON.COM"}})
    3. dispute_transaction(customer_id="CUST001234", transaction_id="TXN987654321", reason="unauthorized_charge")
    4. create_support_ticket(customer_id="CUST001234", issue_type="transaction_dispute", description="Dispute details")

    Best practices:
    - Always authenticate before providing any account information
    - Use masked account numbers in responses (e.g., ****1234)
    - Provide clear, helpful explanations for banking terms
    - Offer proactive assistance for common banking needs
    - Escalate complex issues to human agents when appropriate
    - Follow regulatory compliance for all financial operations

    IMPORTANT SECURITY NOTES:
    - Never bypass authentication requirements
    - Always verify customer identity for sensitive operations
    - Log all access attempts and transactions
    - Use secure communication for sensitive data
    - Follow banking regulations and compliance requirements
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
