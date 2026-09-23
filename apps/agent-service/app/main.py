from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AI Teammates Agent Service", version="0.1.0")


class AgentRequest(BaseModel):
    agent_id: str
    employee_id: str
    company_id: str
    role: str = "software_engineer"
    message: str = Field(min_length=1)


class AgentResponse(BaseModel):
    agent_id: str
    status: str
    response: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "agent-service"}


@app.post("/v1/agents/respond", response_model=AgentResponse)
def respond(request: AgentRequest) -> AgentResponse:
    # Runtime integration point. CrewAI will be wired here after the
    # application-level identity, authorization and memory context are supplied.
    response = (
        f"Agent {request.agent_id} received your work request as a "
        f"{request.role}: {request.message}"
    )
    return AgentResponse(
        agent_id=request.agent_id,
        status="COMPLETED",
        response=response,
    )
