from fastapi import FastAPI
from .models import AgentRequest, AgentResponse
from .memory_policy import is_safe_work_memory
from .policy import requires_human_approval

app = FastAPI(title="AI Teammates Agent Service", version="0.4.0")

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "agent-service"}

@app.post("/v1/agents/respond", response_model=AgentResponse)
def respond(request: AgentRequest) -> AgentResponse:
    if not is_safe_work_memory(request.message):
        return AgentResponse(
            agent_id=request.agent_id,
            status="BLOCKED",
            response="The request contains information that must not be stored as work memory.",
        )
    response = (
        f"Work agent {request.agent_id} ({request.role}) received: "
        f"{request.message}"
    )
    return AgentResponse(agent_id=request.agent_id, status="COMPLETED", response=response)
