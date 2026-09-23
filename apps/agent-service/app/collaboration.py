from pydantic import BaseModel

class AgentMessage(BaseModel):
    task_id: str
    sender_agent_id: str
    receiver_agent_id: str
    company_id: str
    project_id: str | None = None
    type: str
    payload: dict

def validate_message(message: AgentMessage) -> bool:
    return bool(
        message.task_id
        and message.sender_agent_id
        and message.receiver_agent_id
        and message.company_id
    )
