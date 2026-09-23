import os
from fastapi import FastAPI
from .models import AgentRequest, AgentResponse, AgentPlanRequest, ToolPlan
from .memory_policy import is_safe_work_memory
from .collaboration import AgentTaskMessage, TaskResult, execute_task
from .memory import rank_memories, WorkMemory
from .runtime import run_task, plan_tool

app = FastAPI(title="AI Teammates Agent Service", version="0.10.0")

@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-service", "llm_configured": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/v1/agents/respond", response_model=AgentResponse)
def respond(request: AgentRequest):
    response = run_task(request.role, request.message, request.instructions, request.memories, request.conversationHistory)
    status = "COMPLETED" if not response.startswith("[LLM_NOT_CONFIGURED]") else "WAITING_FOR_HUMAN"
    return AgentResponse(agent_id=request.agent_id, status=status, response=response)

@app.post("/v1/agents/plan", response_model=ToolPlan)
def plan(request: AgentPlanRequest):
    return plan_tool(
        request.role,
        request.message,
        request.instructions,
        request.availableTools,
        request.memories,
        request.conversationHistory,
    )

@app.post("/v1/memory/validate")
def validate_memory(body: dict):
    content = str(body.get("content", ""))
    return {"safe": is_safe_work_memory(content)}

@app.post("/v1/agents/execute-task", response_model=TaskResult)
def execute(message: AgentTaskMessage):
    return execute_task(message, "delegated_work_agent")

@app.post("/v1/memory/retrieve")
def retrieve(body: dict):
    memories = [WorkMemory(**m) for m in body.get("memories", [])]
    return {"memories": [m.__dict__ for m in rank_memories(body.get("query", ""), memories)]}
