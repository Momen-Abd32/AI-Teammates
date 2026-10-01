import { WebSocket } from "ws";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, realpath } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { access, constants, stat } from "node:fs/promises";

const exec = promisify(execFile);
const DEVICE_WS_URL = process.env.DEVICE_WS_URL ?? "ws://localhost:3001/device";
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;
const WORKSPACE = resolve(process.env.DEVICE_WORKSPACE ?? process.cwd());
const BROWSER_CDP_URL = process.env.DEVICE_BROWSER_CDP_URL;
const MAX_SCREENSHOT_BYTES = Number(process.env.DEVICE_MAX_SCREENSHOT_BYTES ?? 5 * 1024 * 1024);

if (!DEVICE_TOKEN) throw new Error("DEVICE_TOKEN is required");
const DEVICE_AUTH_TOKEN = DEVICE_TOKEN;

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

async function safePath(input: string, forWrite = false) {
  const target = resolve(WORKSPACE, input);
  const workspaceReal = await realpath(WORKSPACE);
  const parent = resolve(target, "..");
  const check = forWrite ? await realpath(parent) : await realpath(target);
  const rel = relative(workspaceReal, check);
  if (rel.startsWith(".." + sep) || rel === "..") throw new Error("Path is outside the device workspace");
  if (forWrite) {
    const targetRel = relative(workspaceReal, target);
    if (targetRel.startsWith(".." + sep) || targetRel === "..") throw new Error("Path is outside the device workspace");
  }
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

function limitOutput(value: string) {
  if (Buffer.byteLength(value, "utf8") <= MAX_COMMAND_OUTPUT_BYTES) return value;
  return value.slice(0, MAX_COMMAND_OUTPUT_BYTES) + "\n[output truncated by device policy]";
}

async function cdpTarget(baseUrl: string) {
  const response = await fetch(baseUrl.replace(/\/$/, "") + "/json/list", { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Browser CDP target discovery failed");
  const targets = await response.json() as Array<{type?:string;webSocketDebuggerUrl?:string}>;
  const target = targets.find(item => item.type === "page" && item.webSocketDebuggerUrl);
  if (!target?.webSocketDebuggerUrl) throw new Error("No browser page target is available");
  return target.webSocketDebuggerUrl;
}

async function cdpCall(wsUrl: string, method: string, params: Record<string, unknown> = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  try {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    return await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Browser command timed out")), 15000);
      ws.on("message", raw => {
        try {
          const message = JSON.parse(String(raw));
          if (message.id !== id) return;
          clearTimeout(timer);
          if (message.error) reject(new Error(message.error.message ?? "Browser command failed"));
          else resolve(message.result ?? {});
        } catch (error) { reject(error); }
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  } finally { ws.close(); }
}

async function execute(agentId: string, action: string, args: any) {
  isActionAllowed(agentId, action);
  const policy = agentPolicies[agentId];

  if (action === "device.files.read") {
    const path = await safePath(String(args.path));
    await access(path, constants.R_OK);
    await assertFileSize(path);
    return { content: await readFile(path, "utf8") };
  }
  if (action === "device.files.write") {
    const path = await safePath(String(args.path), true);
    const content = String(args.content ?? "");
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error("File exceeds the device-agent size limit");
    await writeFile(path, content, "utf8");
    return { ok: true };
  }
  if (action === "device.screenshot") {
    if (!BROWSER_CDP_URL) throw new Error("DEVICE_BROWSER_CDP_URL is required for screenshots");
    const target = await cdpTarget(BROWSER_CDP_URL);
    const result = await cdpCall(target, "Page.captureScreenshot", { format: String(args.format ?? "png") });
    const data = String((result as any).data ?? "");
    if (Buffer.byteLength(data, "base64") > MAX_SCREENSHOT_BYTES) throw new Error("Screenshot exceeds the device-agent size limit");
    return { format: String(args.format ?? "png"), data };
  }
  if (action === "device.browser") {
    if (!BROWSER_CDP_URL) throw new Error("DEVICE_BROWSER_CDP_URL is required for browser control");
    const operation = String(args.operation ?? "navigate");
    const target = await cdpTarget(BROWSER_CDP_URL);
    if (operation === "navigate") {
      const url = String(args.url ?? "");
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http/https browser navigation is allowed");
      await cdpCall(target, "Page.enable");
      await cdpCall(target, "Page.navigate", { url });
      return { ok: true, url };
    }
    if (operation === "title") {
      const result = await cdpCall(target, "Runtime.evaluate", { expression: "document.title", returnByValue: true });
      return { title: String((result as any).result?.value ?? "") };
    }
    throw new Error("Unsupported browser operation");
  }
  if (action === "device.terminal.execute") {
    const command = String(args.command ?? "").trim();
    const parsed = parseCommand(command, policy);
    const result = await exec(parsed.file, parsed.argv, {
      cwd: WORKSPACE,
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      windowsHide: true,
    });
    return { stdout: limitOutput(result.stdout), stderr: limitOutput(result.stderr) };
  }
  throw new Error("Unsupported action");
}

function connect() {
  const ws = new WebSocket(DEVICE_WS_URL + "?token=" + encodeURIComponent(DEVICE_AUTH_TOKEN));

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
