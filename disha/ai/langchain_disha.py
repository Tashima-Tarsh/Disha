"""LangChain for Disha OS

A clean, visible LangChain integration you can run and inspect.
Uses LCEL for a 7-stage inspired cognitive pipeline + a ReAct agent
with tools that fit Disha's cyber/intel use cases.

Run (after setting OPENAI_API_KEY):
  python -m disha.ai.langchain_disha

This shows real LangChain chains, tool calling, and verbose reasoning.
"""

import os
from typing import Dict, List, Any
from dataclasses import dataclass, field

from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.tools import tool
from langchain.agents import create_react_agent, AgentExecutor
from langchain import hub


@dataclass
class DishaState:
    """State that follows your 7-stage cognitive loop."""
    input: str
    intent: str = ""
    entities: List[str] = field(default_factory=list)
    context: str = ""
    hypotheses: str = ""
    deliberation: str = ""
    action: str = ""
    confidence: float = 0.0


def get_llm():
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.2,
        api_key=os.getenv("OPENAI_API_KEY"),
    )


llm = get_llm()

# Disha-style prompts for the cognitive stages
perceive_prompt = ChatPromptTemplate.from_template(
    "You are the Perceive stage of DISHA.\n"
    "Extract intent and entities from: {input}\n"
    'Return only JSON: {"intent": "...", "entities": [...]}'
)

attend_prompt = ChatPromptTemplate.from_template(
    "You are the Attend stage.\n"
    "Relevant context for: {input} (entities: {entities})"
)

reason_prompt = ChatPromptTemplate.from_template(
    "You are the Reason stage.\n"
    "Hypotheses for: {input}. Context: {context}"
)

deliberate_prompt = ChatPromptTemplate.from_template(
    "Deliberate as Security + Intel team.\n"
    "Input: {input}\nHypotheses: {hypotheses}\nConsensus?"
)

act_prompt = ChatPromptTemplate.from_template(
    "Act stage. Produce final report/action from: {deliberation}\n"
    "Include risk level and confidence."
)

# LCEL chains - this is the "LangChain" you can see and compose
perceive = perceive_prompt | llm | JsonOutputParser()
attend = attend_prompt | llm | StrOutputParser()
reason = reason_prompt | llm | StrOutputParser()
deliberate = deliberate_prompt | llm | StrOutputParser()
act = act_prompt | llm | StrOutputParser()


def run_disha_lcel_cognitive(input_text: str) -> Dict[str, Any]:
    """Run a visible LCEL version of your 7-stage cognitive loop."""
    state: Dict[str, Any] = {"input": input_text}

    perceived = perceive.invoke(state)
    state.update(perceived)

    state["context"] = attend.invoke(state)
    state["hypotheses"] = reason.invoke(state)
    state["deliberation"] = deliberate.invoke(state)
    state["action"] = act.invoke(state)
    state["confidence"] = 0.68

    return state


# Tools that feel native to Disha (easy to wire to your real services later)
@tool
def disha_intel_search(query: str) -> str:
    """Search Disha intel/graph for the query."""
    return f"[Disha Intel] High-confidence hits for '{query}' (linked to known campaigns)."


@tool
def disha_risk_assess(entity: str) -> str:
    """Disha-style risk assessment."""
    return f"Risk for {entity}: MEDIUM. Recommend full cognitive loop."


tools = [disha_intel_search, disha_risk_assess]


# The LangChain ReAct agent - this is what you will SEE running
agent_prompt = hub.pull("hwchase17/react")
agent = create_react_agent(llm, tools, agent_prompt)
executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,  # <--- This prints the LangChain thinking + tool calls
    handle_parsing_errors=True,
)


def run_disha_langchain_agent(query: str) -> Dict[str, Any]:
    """Run and SEE the full LangChain agent for Disha tasks."""
    print("\n=== DISHA + LANGCHAIN AGENT (watch the reasoning) ===")
    print(f"Query: {query}\n")
    result = executor.invoke({"input": query})
    return result


if __name__ == "__main__":
    print("LangChain for Disha OS")
    print("Set OPENAI_API_KEY in .env to run for real.\n")

    # 1. See the LCEL cognitive pipeline (composable stages)
    print("--- LCEL Cognitive Loop Demo ---")
    res = run_disha_lcel_cognitive(
        "Investigate suspicious domain example.com linked to recent breach"
    )
    print("Action from LangChain:", res.get("action", "")[:220], "...\n")

    # 2. See the Agent (this is the part you "see" with verbose=True)
    print("--- ReAct Agent Demo ---")
    out = run_disha_langchain_agent(
        "Use Disha tools to assess threat from bad.example and suggest actions"
    )
    print("\nFinal answer:", out.get("output", "")[:220])
