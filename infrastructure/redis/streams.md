# Agent Message Bus

Redis Streams is the initial transport.

Stream: `agent:tasks`

Message envelope:

```json
{
  "task_id": "uuid",
  "sender_agent_id": "uuid",
  "receiver_agent_id": "uuid",
  "company_id": "uuid",
  "project_id": "uuid",
  "type": "TASK_REQUEST",
  "payload": {}
}
```

Consumers must validate tenant and project authorization before processing the message.
