from pydantic import BaseModel
class ToolRequest(BaseModel):
 agent_id:str
 company_id:str
 action:str
 resource:str
SENSITIVE_ACTIONS={"production.deploy","secrets.read","repository.delete","user.remove","sandbox.execute"}
def requires_human_approval(action:str)->bool:
 return action in SENSITIVE_ACTIONS
