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
    "allowedActions": ["device.files.read", "device.files.write", "device.terminal.execute"],
    "allowedCommands": ["git", "npm", "pnpm"]
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


## Terminal safety boundary

The desktop runtime applies two command allowlists: the global `DEVICE_ALLOWED_COMMANDS` list and an optional agent-specific `allowedCommands` list. The agent-specific list can only narrow the global list.

Terminal execution is performed without a shell, with the working directory fixed to the configured workspace, a configurable timeout, and output/file size limits. Shell chaining and redirection operators are rejected.

These controls are application-level boundaries; they are not an OS/container sandbox.


## Browser and screenshot integration

The desktop runtime can optionally connect to a Chromium-based browser through Chrome DevTools Protocol (CDP). Set:

- `DEVICE_BROWSER_CDP_URL=http://127.0.0.1:9222`
- `DEVICE_MAX_SCREENSHOT_BYTES=5242880`

`device.browser` supports the restricted operations `navigate` (HTTP/HTTPS URLs only) and `title`. `device.screenshot` captures the active page as a PNG/JPEG payload. These capabilities still require both the global action allowlist and the agent binding permission.

## Execution reliability

Device commands are persisted before delivery. If the desktop socket is unavailable, the API finalizes the queued command as `FAILED` rather than leaving it indefinitely queued. Device result completion is idempotent: terminal commands cannot be overwritten after they reach a final state.

Workspace file access also verifies the resolved path stays inside the configured workspace, reducing symlink/path traversal risk.

## End-to-end runtime contract

The production path is:

`Employee -> Web -> AgentService -> Planner -> ToolPolicy/Approval -> ToolExecution -> DeviceService -> DeviceGateway -> Desktop Agent -> tool result -> AgentService -> Web`

For delegated work the path extends to:

`Agent A -> Collaboration/Task -> Agent B -> shared Desktop Agent -> result -> Agent A`

The API tests cover tool execution, approval pause/resume, device authorization, delivery failure handling, and bound-device resolution. CI is the final validation gate for the integrated repository.
