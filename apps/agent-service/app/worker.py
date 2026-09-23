import json,os,redis
from .collaboration import AgentTaskMessage
from .runtime import run_task

STREAM=os.getenv("REDIS_STREAM","agent:tasks")
RESPONSE_STREAM=os.getenv("REDIS_RESPONSE_STREAM","agent:responses")
GROUP=os.getenv("REDIS_GROUP","agent-runtime")

def run_once(consumer="runtime-1"):
    c=redis.Redis.from_url(os.getenv("REDIS_URL","redis://localhost:6379"),decode_responses=True)
    try:
        c.xgroup_create(STREAM,GROUP,"0",mkstream=True)
    except redis.ResponseError:
        pass
    result=c.xreadgroup(GROUP,consumer,{STREAM:">"},count=10,block=1000)
    for _,items in result:
        for mid,f in items:
            try:
                task=AgentTaskMessage(
                    task_id=f["taskId"],
                    sender_agent_id=f["senderAgentId"],
                    receiver_agent_id=f["receiverAgentId"],
                    company_id=f["companyId"],
                    project_id=f.get("projectId") or None,
                    type=f["type"],
                    payload=json.loads(f.get("payload","{}")),
                )
                description=str(task.payload.get("description","")).strip()
                if not description:
                    raise ValueError("Task has no description")
                role=str(task.payload.get("receiverRole","delegated_work_agent"))
                instructions=str(task.payload.get("instructions",""))
                response=run_task(role,description,instructions)
                status="COMPLETED" if not response.startswith("[LLM_NOT_CONFIGURED]") else "WAITING_FOR_HUMAN"
                c.xadd(RESPONSE_STREAM,"*",{
                    "taskId":task.task_id,
                    "agentId":task.receiver_agent_id,
                    "status":status,
                    "response":response,
                    "artifacts":"[]",
                })
                c.xack(STREAM,GROUP,mid)
            except Exception as exc:
                c.xadd(RESPONSE_STREAM,"*",{
                    "taskId":f.get("taskId",""),
                    "agentId":f.get("receiverAgentId",""),
                    "status":"FAILED",
                    "response":str(exc),
                    "artifacts":"[]",
                })
                c.xack(STREAM,GROUP,mid)

if __name__=="__main__":
    while True:
        run_once()
