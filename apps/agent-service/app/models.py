from typing import Literal
from pydantic import BaseModel, Field

MemoryScope = Literal["PRIVATE", "PROJECT", "TEAM", "COMPANY"]


class AgentContext(BaseModel):
    agent_id: str
    employee_id: str
    company_id: str
    role: str
    permissions: list[str] = Field(default_factory=list)


class AgentRequest(AgentContext):
    message: str = Field(min_length=1)


class AgentResponse(BaseModel):
    agent_id: str
    status: str
    response: str
