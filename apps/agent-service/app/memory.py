from dataclasses import dataclass
from typing import Literal
Scope=Literal["PRIVATE","PROJECT","TEAM","COMPANY"]
@dataclass
class WorkMemory:
 id:str; agent_id:str; company_id:str; scope:Scope; content:str
def rank_memories(query:str,memories:list[WorkMemory],limit:int=5):
 terms=set(query.lower().split()); scored=[]
 for m in memories: scored.append((sum(t in m.content.lower() for t in terms),m))
 scored.sort(key=lambda x:x[0],reverse=True)
 return [m for score,m in scored[:limit] if score>0]
