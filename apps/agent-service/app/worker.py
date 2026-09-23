import json, os, redis
from .collaboration import AgentTaskMessage, execute_task
STREAM=os.getenv("REDIS_STREAM","agent:tasks"); GROUP=os.getenv("REDIS_GROUP","agent-runtime")
def run_once(consumer="runtime-1"):
 c=redis.Redis.from_url(os.getenv("REDIS_URL","redis://localhost:6379"),decode_responses=True)
 try:c.xgroup_create(STREAM,GROUP,"0",mkstream=True)
 except redis.ResponseError:pass
 for _,items in c.xreadgroup(GROUP,consumer,{STREAM:">"},count=10,block=1000):
  for mid,f in items:
   task=AgentTaskMessage(task_id=f["taskId"],sender_agent_id=f["senderAgentId"],receiver_agent_id=f["receiverAgentId"],company_id=f["companyId"],project_id=f.get("projectId"),type=f["type"],payload=json.loads(f.get("payload","{}")))
   result=execute_task(task,"delegated_work_agent"); c.xack(STREAM,GROUP,mid); yield result
if __name__=="__main__":
 while True: list(run_once())
