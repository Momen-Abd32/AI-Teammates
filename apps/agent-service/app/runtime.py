from crewai import Agent

def build_agent(role: str) -> Agent:
    return Agent(
        role=role,
        goal="Help the employee complete legitimate work tasks.",
        backstory="You are a professional AI teammate. You only use authorized work context.",
        verbose=False,
    )
