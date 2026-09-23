from fastapi import FastAPI
from .models import AgentRequest, AgentResponse

app = FastAPI(title="AI Teammates Agent Service", version="0.3.0")

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "agent-service"}

@app.post("/v1/agents/respond", response_model=AgentResponse)
def respond(request: AgentRequest) -> AgentResponse:
    # Runtime is deliberately isolated from authorization.
    response = (
        f"Work agent {request.agent_id} ({request.role}) received: "
        f"{request.message}"
    )
    return AgentResponse(agent_id=request.agent_id, status="COMPLETED", response=response)
