import { WebSocket } from "ws";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { access, constants, stat } from "node:fs/promises";

const exec = promisify(execFile);
const DEVICE_WS_URL = process.env.DEVICE_WS_URL ?? "ws://localhost:3001/device";
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;
const WORKSPACE = resolve(process.env.DEVICE_WORKSPACE ?? process.cwd());

if (!DEVICE_TOKEN) throw new Error("DEVICE_TOKEN is required");

type AgentPolicy = { enabled?: boolean; allowedActions?: string[]; allowedCommands?: string[] };
type AgentPolicies = Record<string, AgentPolicy>;

function loadAgentPolicies(): AgentPolicies {
  const raw = process.env.DEVICE_AGENT_POLICIES;
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("policy must be an object");
    return parsed as AgentPolicies;
  } catch (error) {
    throw new Error(`Invalid DEVICE_AGENT_POLICIES: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const globalAllowedActions = new Set(
  (process.env.DEVICE_ALLOWED_ACTIONS ?? "device.files.read")
    .split(",").map(x => x.trim()).filter(Boolean),
);
const agentPolicies = loadAgentPolicies();

function safePath(input: string) {
  const target = resolve(WORKSPACE, input);
  const rel = relative(WORKSPACE, target);
  if (rel.startsWith(".." + sep) || rel === "..") throw new Error("Path is outside the device workspace");
  return target;
}

function isActionAllowed(agentId: string, action: string) {
  if (!agentId?.trim()) throw new Error("agentId is required");
  if (!globalAllowedActions.has(action)) throw new Error("Device action is not allowed by local policy");

  const policy = agentPolicies[agentId];
  if (!policy) return;
  if (policy.enabled === false) throw new Error("Agent is disabled by local device policy");
  if (Array.isArray(policy.allowedActions) && !policy.allowedActions.includes(action)) {
    throw new Error("Action is not allowed for this agent by local policy");
  }
}


const MAX_FILE_BYTES = Number(process.env.DEVICE_MAX_FILE_BYTES ?? 2 * 1024 * 1024);
const MAX_COMMAND_OUTPUT_BYTES = Number(process.env.DEVICE_MAX_COMMAND_OUTPUT_BYTES ?? 1024 * 1024);
const COMMAND_TIMEOUT_MS = Number(process.env.DEVICE_COMMAND_TIMEOUT_MS ?? 30000);
const ALLOWED_COMMANDS = new Set((process.env.DEVICE_ALLOWED_COMMANDS ?? "node,npm,pnpm,npx,python,python3,git").split(",").map(x => x.trim()).filter(Boolean));

async function assertFileSize(path: string) {
  const info = await stat(path);
  if (info.size > MAX_FILE_BYTES) throw new Error("File exceeds the device-agent size limit");
}

function parseCommand(command: string, policy?: AgentPolicy) {
  const parts = command.match(/(?:[^\\s"]+|"[^"]*")+/g)?.map(part => part.replace(/^"(.*)"$/, "$1")) ?? [];
  if (!parts.length) throw new Error("Command is required");
  const file = parts[0].split(/[\\\\/]/).pop() ?? "";
  if (!ALLOWED_COMMANDS.has(file)) throw new Error("Command is not allowed by the device policy: " + file);
  if (Array.isArray(policy?.allowedCommands) && !policy.allowedCommands.includes(file)) throw new Error("Command is not allowed for this agent: " + file);
  if (parts.some(part => [";","&","|","<",">","$"].some(token => part.includes(token)))) throw new Error("Shell operators are not allowed");
  return { file, argv: parts.slice(1) };
}

async function execute(agentId: string, action: string, args: any) {
  isActionAllowed(agentId, action);

  if (action === "device.files.read") {
    const path = safePath(String(args.path));
    await access(path, constants.R_OK);
    await assertFileSize(path);
    return { content: await readFile(path, "utf8") };
  }
  if (action === "device.files.write") {
    const path = safePath(String(args.path));
    const content = String(args.content ?? "");
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error("File exceeds the device-agent size limit");
    await writeFile(path, content, "utf8");
    return { ok: true };
  }
  if (action === "device.screenshot") {
    throw new Error("Screenshot capability is reserved for the desktop integration layer");
  }
  if (action === "device.browser") {
    throw new Error("Browser capability is reserved for the browser automation layer");
  }
  if (action === "device.terminal.execute") {
    const command = String(args.command ?? "").trim();
    if (!command) throw new Error("Command is required");
    const [file, ...argv] = command.split(/\s+/);
    const result = await exec(file, argv, { cwd: WORKSPACE, timeout: 30000, maxBuffer: 1024 * 1024 });
    return { stdout: result.stdout, stderr: result.stderr };
  }
  throw new Error("Unsupported action");
}

function connect() {
  const ws = new WebSocket(DEVICE_WS_URL + "?token=" + encodeURIComponent(DEVICE_TOKEN));

  ws.on("open", () => console.log("AI Teammates device connected"));
  ws.on("message", async raw => {
    let message: any;
    try { message = JSON.parse(String(raw)); } catch { return; }
    if (message.type !== "DEVICE_COMMAND") return;

    const command = message.command ?? {};
    const agentId = String(command.agentId ?? "").trim();
    const commandId = String(command.id ?? "").trim();
    if (!commandId || !agentId) {
      ws.send(JSON.stringify({
        type: "device.result", commandId: commandId || "unknown",
        status: "REJECTED", result: { error: "agentId and command id are required" },
      }));
      return;
    }

    try {
      const result = await execute(agentId, String(command.action ?? ""), command.arguments ?? {});
      ws.send(JSON.stringify({
        type: "device.result", commandId, agentId, status: "COMPLETED", result,
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: "device.result", commandId, agentId, status: "FAILED",
        result: { error: error instanceof Error ? error.message : String(error) },
      }));
    }
  });

  ws.on("close", () => setTimeout(connect, 3000));
  ws.on("error", () => undefined);
}

connect();
