# Multi-Agent Same-Device Runtime

AI Teammates supports multiple specialized agents for the same employee on the same physical device.

## Model

`Employee -> Device -> Agent A / Agent B / Agent C`

An agent is owned by exactly one employee. A device can be bound to multiple agents belonging to that employee.

Each agent keeps its own agent ID, role, work instructions, permissions, memory namespace, conversations and runs.

The desktop runtime is shared by the device, but every incoming command carries the `agentId`. The runtime checks the global device policy first and then the optional per-agent policy.

## Local policy

Set `DEVICE_AGENT_POLICIES` to JSON when different agents need different local capabilities:

```json
{
  "coding-agent-id": {
    "enabled": true,
    "allowedActions": ["device.files.read", "device.files.write", "device.terminal.execute"]
  },
  "testing-agent-id": {
    "enabled": true,
    "allowedActions": ["device.files.read", "device.terminal.execute"]
  }
}
```

The global `DEVICE_ALLOWED_ACTIONS` list remains the upper bound. An agent cannot grant itself a capability that the device has not globally enabled.

## Typical setup

1. Create several agents for the same employee.
2. Register one employee device.
3. Bind each agent to that device with its own permissions.
4. Run one desktop-agent process for the device.
5. Send commands with the target `agentId`.
6. The desktop runtime validates the agent identity and executes only actions allowed for that agent.

This keeps the physical device shared while preserving agent-level authorization and memory boundaries.
