from fastapi import FastAPI
from .models import AgentRequest,AgentResponse
from .memory_policy import is_safe_work_memory
from .collaboration import AgentTaskMessage,TaskResult,execute_task
from .memory import rank_memories,WorkMemory
app=FastAPI(title="AI Teammates Agent Service",version="0.6.0")
@app.get("/health")
def health(): return {"status":"ok","service":"agent-service"}
@app.post("/v1/agents/respond",response_model=AgentResponse)
def respond(request:AgentRequest):
 if not is_safe_work_memory(request.message): return AgentResponse(agent_id=request.agent_id,status="BLOCKED",response="Unsafe information cannot be stored as work memory.")
 return AgentResponse(agent_id=request.agent_id,status="COMPLETED",response=f"Work agent {request.agent_id} ({request.role}) received: {request.message}")
@app.post("/v1/agents/execute-task",response_model=TaskResult)
def execute(message:AgentTaskMessage): return execute_task(message,"delegated_work_agent")
@app.post("/v1/memory/retrieve")
def retrieve(body:dict):
 memories=[WorkMemory(**m) for m in body.get("memories",[])]
 return {"memories":[m.__dict__ for m in rank_memories(body.get("query",""),memories)]}
