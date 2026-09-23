import json,os,redis
from .collaboration import AgentTaskMessage,execute_task
STREAM=os.getenv("REDIS_STREAM","agent:tasks");RESPONSE_STREAM=os.getenv("REDIS_RESPONSE_STREAM","agent:responses");GROUP=os.getenv("REDIS_GROUP","agent-runtime")
def run_once(consumer="runtime-1"):
 c=redis.Redis.from_url(os.getenv("REDIS_URL","redis://localhost:6379"),decode_responses=True)
 try:c.xgroup_create(STREAM,GROUP,"0",mkstream=True)
 except redis.ResponseError:pass
 result=c.xreadgroup(GROUP,consumer,{STREAM:">"},count=10,block=1000)
 for _,items in result:
  for mid,f in items:
   try:
    task=AgentTaskMessage(task_id=f["taskId"],sender_agent_id=f["senderAgentId"],receiver_agent_id=f["receiverAgentId"],company_id=f["companyId"],project_id=f.get("projectId") or None,type=f["type"],payload=json.loads(f.get("payload","{}")))
    task_result=execute_task(task,"delegated_work_agent")
    c.xadd(RESPONSE_STREAM,"*",{"taskId":task_result.task_id,"agentId":task_result.agent_id,"status":task_result.status,"response":task_result.response,"artifacts":json.dumps(task_result.artifacts)})
    c.xack(STREAM,GROUP,mid)
   except Exception as exc:
    c.xadd(RESPONSE_STREAM,"*",{"taskId":f.get("taskId",""),"agentId":f.get("receiverAgentId",""),"status":"FAILED","response":str(exc),"artifacts":"[]"})
    c.xack(STREAM,GROUP,mid)
if __name__=="__main__":
 while True:run_once()
