# Device Runtime and Sandbox Execution

## 1. Two distinct execution paths

AI Teammates contains two execution-related components with different purposes:

1. **Desktop agent** (`apps/desktop-agent`) — connects to the API and can act on an explicitly configured local workspace under device/action policy.
2. **Sandbox worker** (`apps/sandbox-worker`) — uses Docker Engine to run limited Python/Node snippets in short-lived containers.

Do not describe these as the same runtime. The desktop agent's allowlists and workspace checks are not equivalent to container isolation.

## 2. Desktop agent startup

The desktop agent reads configuration including:

- `DEVICE_WS_URL` — defaults to `ws://localhost:3001/device`.
- `DEVICE_TOKEN` — required; process exits if absent.
- `DEVICE_WORKSPACE` — workspace root, defaults to current working directory.
- `DEVICE_ALLOWED_ACTIONS` — global action allowlist.
- `DEVICE_ALLOWED_COMMANDS` — allowed executable names.
- `DEVICE_COMMAND_TIMEOUT_MS` — command timeout.
- File/output size caps.
- Optional per-agent policies in `DEVICE_AGENT_POLICIES`.
- Optional browser CDP URL and screenshot limit.

Use a dedicated project directory for `DEVICE_WORKSPACE`. Do not point it at the entire user profile, home directory, root drive or a directory containing unrelated private files.

## 3. Agent-specific policy

Each device command carries an agent ID. The desktop agent checks that an action is globally allowed, then applies optional policy for that agent. Per-agent policy can disable an agent or narrow its allowed actions/commands; it cannot override the global allowlist.

A typical policy object is keyed by actual agent IDs:

```json
{
  "agent-id-from-your-database": {
    "enabled": true,
    "allowedActions": ["device.files.read", "device.files.write"],
    "allowedCommands": ["git", "pnpm"]
  }
}
```

This is an illustrative example. Only add actions that exist in the runtime and are required for the task.

## 4. File access

File operations are rooted at `DEVICE_WORKSPACE`. The runtime resolves paths and checks that targets remain inside the configured workspace. File operations also apply a maximum file size. These checks reduce path traversal risk but should be supplemented with OS-level permissions and isolation.

## 5. Terminal execution

Terminal commands are parsed into an executable and arguments and launched without a shell. The executable must be in `DEVICE_ALLOWED_COMMANDS`, and optional agent policy may further restrict it. Shell operators such as chaining/redirection are rejected. Command timeouts and output caps limit resource consumption.

Do not add `cmd`, `powershell`, `sh`, `bash`, or other broad interpreters to the allowlist without a separate security review; doing so can undermine the intended restriction.

## 6. Browser and screenshots

Optional Chromium DevTools Protocol integration is configured with `DEVICE_BROWSER_CDP_URL`, commonly a local CDP endpoint. Browser navigation is intended to be restricted to HTTP/HTTPS and a small operation set; screenshots have a configured maximum payload size.

Protect the browser debugging endpoint. Anyone who can access a CDP endpoint may gain significant control over that browser session.

## 7. Device command lifecycle

The API records commands and associates them with the device, agent and relevant task context. The device gateway delivers commands over WebSocket. The desktop runtime executes permitted actions and returns a result. Completion is designed to be idempotent so that a finalized command is not overwritten by a later result. Delivery failures should be surfaced rather than leaving work silently queued forever.

## 8. Sandbox worker

The sandbox worker currently exposes a health endpoint and an execution endpoint. The execution request includes an agent ID, a language and code. The code path accepts only the languages defined in the worker source (currently Python and Node) and launches a container with resource limits, disabled networking, a read-only root filesystem, dropped capabilities and a non-root user. The worker applies a bounded wait and removes the container after execution.

Requirements and limitations:
- Docker Engine must be available to the worker.
- The configured image must be available/pullable.
- Supported languages/commands are hard-coded in the worker.
- A timeout or container failure must be treated as a failed execution, not a successful task.
- Sandbox execution is not started by the Docker-free Windows helper script.

## 9. Security checklist

- Use a dedicated workspace directory.
- Use unique device tokens and rotate/revoke them when necessary.
- Keep global action/command allowlists narrow.
- Bind agents only to devices they are authorized to use.
- Avoid logging tokens or sensitive file contents.
- Secure WebSocket transport in deployed environments.
- Restrict access to Docker Engine and the sandbox worker.
- Test denied actions, invalid paths, oversized files and timeout behavior.
