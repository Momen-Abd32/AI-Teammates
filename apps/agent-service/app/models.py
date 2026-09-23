from typing import Literal
from pydantic import BaseModel, Field

MemoryScope = Literal["PRIVATE", "PROJECT", "TEAM", "COMPANY"]

class ConversationMessage(BaseModel):
    sender: Literal["USER", "AGENT", "SYSTEM"]
    content: str = Field(min_length=1, max_length=20000)

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
    conversationHistory: list[ConversationMessage] = Field(default_factory=list)

class ToolPlan(BaseModel):
    action: Literal["NONE", "TOOL"]
    tool: str | None = None
    reason: str = ""
    arguments: dict[str, object] = Field(default_factory=dict)

class AgentPlanRequest(AgentContext):
    message: str = Field(min_length=1, max_length=20000)
    memories: list[MemoryContext] = Field(default_factory=list)
    conversationHistory: list[ConversationMessage] = Field(default_factory=list)
    availableTools: list[dict[str, object]] = Field(default_factory=list)

class AgentResponse(BaseModel):
    agent_id: str
    status: str
    response: str
