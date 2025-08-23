from dataclasses import dataclass

from langgraph.pregel import Pregel

from agents.jira_assistant import jira_assistant
from agents.jira_supervisor_assistant import jira_supervisor_assistant
from schema import AgentInfo

DEFAULT_AGENT = "jira-assistant"


@dataclass
class Agent:
    description: str
    graph: Pregel


agents: dict[str, Agent] = {
    "jira-assistant": Agent(
        description="A JIRA assistant to manage JIRA board.", graph=jira_assistant
    ),
    "jira-supervisor-assistant": Agent(
        description="A JIRA supervisor assistant with specialized sub-agents for different JIRA domains.",
        graph=jira_supervisor_assistant,
    ),
}


def get_agent(agent_id: str) -> Pregel:
    return agents[agent_id].graph


def get_all_agent_info() -> list[AgentInfo]:
    return [
        AgentInfo(key=agent_id, description=agent.description)
        for agent_id, agent in agents.items()
    ]
