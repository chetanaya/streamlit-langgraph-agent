from dataclasses import dataclass

from langgraph.pregel import Pregel

from agents.banking_assistant import banking_assistant
from schema import AgentInfo

DEFAULT_AGENT = "banking-assistant"


@dataclass
class Agent:
    description: str
    graph: Pregel


agents: dict[str, Agent] = {
    "banking-assistant": Agent(
        description="A banking assistant to manage customer interactions.",
        graph=banking_assistant,
    ),
}


def get_agent(agent_id: str) -> Pregel:
    return agents[agent_id].graph


def get_all_agent_info() -> list[AgentInfo]:
    return [
        AgentInfo(key=agent_id, description=agent.description)
        for agent_id, agent in agents.items()
    ]
