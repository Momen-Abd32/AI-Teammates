from pydantic import BaseModel
from typing import Literal

class AgentTaskMessage(BaseModel):
    task_id: str
    sender_agent_id: str
    receiver_agent_id: str
    company_id: str
    project_id: str | None = None
    type: Literal["TASK_REQUEST", "TASK_RESPONSE"]
    payload: dict

class TaskResult(BaseModel):
    task_id: str
    agent_id: str
    status: Literal["COMPLETED", "BLOCKED", "FAILED"]
    response: str
    artifacts: list[str] = []

def execute_task(message: AgentTaskMessage, agent_role: str) -> TaskResult:
    description = str(message.payload.get("description", ""))
    if not description:
        return TaskResult(
            task_id=message.task_id,
            agent_id=message.receiver_agent_id,
            status="BLOCKED",
            response="Task has no description.",
        )
    return TaskResult(
        task_id=message.task_id,
        agent_id=message.receiver_agent_id,
        status="COMPLETED",
        response=f"{agent_role} completed the delegated work: {description}",
    )
