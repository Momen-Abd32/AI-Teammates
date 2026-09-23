from typing import Literal
from pydantic import BaseModel, Field

MemoryScope = Literal["PRIVATE", "PROJECT", "TEAM", "COMPANY"]

class MemoryContext(BaseModel):
    scope: MemoryScope
    content: str = Field(min_length=1, max_length=12000)
    score: float | None = None

class AgentContext(BaseModel):
    agent_id: str
    employee_id: str
    company_id: str
    role: str
    permissions: list[str] = Field(default_factory=list)
    instructions: str = ""

class AgentRequest(AgentContext):
    message: str = Field(min_length=1, max_length=20000)
    memories: list[MemoryContext] = Field(default_factory=list)

class AgentResponse(BaseModel):
    agent_id: str
    status: str
    response: str
