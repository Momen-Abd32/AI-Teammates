import os
from crewai import Agent, Crew, Task

def build_agent(role: str, instructions: str = "") -> Agent:
    return Agent(
        role=role,
        goal="Complete legitimate professional work tasks using only authorized work context.",
        backstory="You are an AI teammate. Protect private information, never invent access, and ask for clarification when required.",
        verbose=False,
        allow_delegation=False,
    )

def run_task(role: str, description: str, instructions: str = "") -> str:
    if not os.getenv("OPENAI_API_KEY"):
        return "[LLM_NOT_CONFIGURED] " + role + " received task: " + description
    agent = build_agent(role, instructions)
    task = Task(
        description=description,
        expected_output="A concise, actionable result. State blockers instead of inventing facts.",
        agent=agent,
    )
    crew = Crew(agents=[agent], tasks=[task], verbose=False)
    return str(crew.kickoff())
