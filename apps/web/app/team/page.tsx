"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { apiFetch } from "../../lib/auth";

type Agent = {
  id: string;
  role: string;
  aiProvider?: string;
  aiModel?: string;
  permissions?: string[];
};
type StageResult = {
  stage: string;
  agentId?: string;
  agentRole?: string;
  taskId?: string;
  status: string;
  response?: string;
  error?: string;
};
type TeamTask = {
  id: string;
  title: string;
  status: string;
  assignedAgentId?: string;
  createdAt?: string;
};
type ChatMessage = {
  id: string;
  kind: "user" | "team";
  text: string;
  stages?: StageResult[];
  status?: string;
};

const stageIcon: Record<string, string> = {
  Coding: "⌘",
  Testing: "✓",
  Documentation: "▤",
};

export default function TeamChatPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkspace() {
    const auth = await apiFetch("/auth/validate", { method: "POST" });
    if (!auth.ok) {
      window.location.href = "/login";
      return;
    }
    const [agentResponse, taskResponse] = await Promise.all([
      apiFetch("/organization/my-agents"),
      apiFetch("/tasks"),
    ]);
    if (agentResponse.ok) setAgents(await agentResponse.json());
    if (taskResponse.ok) {
      const allTasks: TeamTask[] = await taskResponse.json();
      setTasks(allTasks.filter((task) => task.title?.startsWith("Team ")).slice(0, 8));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace().catch(() => {
      setError("Could not load your workspace. Check that the API is running, then refresh.");
      setLoading(false);
    });
  }, []);

  async function send() {
    const request = input.trim();
    if (!request || sending) return;
    setInput("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: "user-" + Date.now(), kind: "user", text: request },
    ]);
    setSending(true);

    try {
      const response = await apiFetch("/orchestrator/team-run", {
        method: "POST",
        body: JSON.stringify({ message: request }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = payload.message ?? "The team could not start this request.";
        setError(Array.isArray(reason) ? reason.join(" ") : String(reason));
        setSending(false);
        return;
      }
      const stages: StageResult[] = payload.stages ?? [];
      const summary = payload.status === "COMPLETED"
        ? "The team workflow finished."
        : payload.status === "WAITING_FOR_HUMAN"
          ? "The team is waiting for your approval before continuing."
          : "The team workflow finished with items that need attention.";
      setMessages((current) => [
        ...current,
        {
          id: "team-" + Date.now(),
          kind: "team",
          text: summary,
          stages,
          status: payload.status,
        },
      ]);
      await loadWorkspace();
    } catch {
      setError("Could not reach the API. Make sure the API and agent service are running.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <main style={styles.center}>Loading your team workspace…</main>;
  }

  return (
    <main style={styles.shell}>
      <aside style={styles.sidebar}>
        <a href="/dashboard" style={styles.brand}>AI Teammates</a>
        <div style={styles.subBrand}>TEAM WORKSPACE</div>
        <div style={styles.managerCard}>
          <div style={styles.managerIcon}>✦</div>
          <div>
            <strong>Team Manager</strong>
            <div style={styles.muted}>One request. Coordinated work.</div>
          </div>
          <span style={styles.onlineDot} title="Ready" />
        </div>

        <div style={styles.sectionTitle}>YOUR SPECIALISTS <span>{agents.length}</span></div>
        {agents.map((agent) => (
          <div key={agent.id} style={styles.agent}>
            <span style={styles.agentAvatar}>{agent.role.slice(0, 1).toUpperCase()}</span>
            <div style={styles.agentText}>
              <strong>{agent.role}</strong>
              <span>{agent.aiProvider ?? "AI"}{agent.aiModel ? " · " + agent.aiModel : ""}</span>
            </div>
            <span style={styles.ready}>Ready</span>
          </div>
        ))}
        {!agents.length && (
          <div style={styles.emptyAgents}>
            No teammates yet.<br />
            <a href="/my-agent">Add your first specialist →</a>
          </div>
        )}

        <div style={styles.sidebarBottom}>
          <a href="/my-agent" style={styles.navLink}>Manage agents ↗</a>
          <div style={styles.privacyNote}>Agents keep their own roles and permissions while the manager coordinates tasks.</div>
        </div>
      </aside>

      <section style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>WORKSPACE / TEAM CHAT</div>
            <h1 style={styles.title}>What are we building today?</h1>
            <p style={styles.subtitle}>Tell the team what you need. The manager routes work to the specialists you added.</p>
          </div>
          <a href="/my-agent" style={styles.manageButton}>Manage agents</a>
        </header>

        <div style={styles.conversation}>
          {!messages.length && (
            <div style={styles.welcome}>
              <div style={styles.sparkle}>✦</div>
              <h2>Your team, in one chat.</h2>
              <p>For a software build request, the manager runs Coding → Testing → Documentation in order. You don't need to open each agent's chat.</p>
              <div style={styles.examples}>
                <button style={styles.example} onClick={() => setInput("Build a task management web app with a clean responsive UI.")}>Build a web app <span>↗</span></button>
                <button style={styles.example} onClick={() => setInput("Review the existing project and run its tests.")}>Test my project <span>↗</span></button>
                <button style={styles.example} onClick={() => setInput("Update the README and document how to run the project.")}>Document the project <span>↗</span></button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} style={message.kind === "user" ? styles.userMessage : styles.teamMessage}>
              <div style={styles.messageLabel}>{message.kind === "user" ? "YOU" : "TEAM MANAGER"}</div>
              <div style={styles.messageText}>{message.text}</div>
              {message.stages?.map((stage, index) => (
                <div key={stage.taskId ?? stage.stage + index} style={styles.stageCard}>
                  <div style={styles.stageTop}>
                    <span style={styles.stageIcon}>{stageIcon[stage.stage] ?? "•"}</span>
                    <div style={styles.stageName}>
                      <strong>{stage.stage}</strong>
                      <span>{stage.agentRole ?? (stage.status === "SKIPPED" ? "Specialist not configured" : "Team stage")}</span>
                    </div>
                    <span style={statusStyle(stage.status)}>{stage.status.replace(/_/g, " ")}</span>
                  </div>
                  {stage.response && <p style={styles.stageResponse}>{stage.response}</p>}
                  {stage.error && <p style={styles.stageError}>{stage.error}</p>}
                  {stage.taskId && <div style={styles.taskLink}>Task ID: {stage.taskId}</div>}
                </div>
              ))}
            </div>
          ))}
          {sending && (
            <div style={styles.teamMessage}>
              <div style={styles.messageLabel}>TEAM MANAGER</div>
              <div style={styles.running}><span style={styles.spinner}>◌</span> Coordinating your team. Agents are running sequentially; this may take a little while…</div>
            </div>
          )}
          <div />
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {!agents.length && <div style={styles.warning}>Add agents in My Agents before starting team work.</div>}
        <form style={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
            placeholder="Describe the project or task for your team…"
            rows={2}
            disabled={sending || !agents.length}
            style={styles.textarea}
          />
          <button type="submit" disabled={sending || !input.trim() || !agents.length} style={styles.sendButton}>
            {sending ? "Working…" : "Run team"} <span>↑</span>
          </button>
          <div style={styles.composerHint}>Enter to send · Shift + Enter for a new line</div>
        </form>
      </section>

      <aside style={styles.tasksSidebar}>
        <div style={styles.sectionTitle}>RECENT TEAM TASKS</div>
        {!tasks.length && <p style={styles.muted}>Your delegated tasks will appear here after the first run.</p>}
        {tasks.map((task) => (
          <div key={task.id} style={styles.taskItem}>
            <div style={styles.taskStatusDot} />
            <div style={styles.taskItemText}>
              <strong>{task.title}</strong>
              <span>{task.status.replace(/_/g, " ")}</span>
            </div>
          </div>
        ))}
        <div style={styles.taskFooter}>Task records are stored by the API. Chat messages on this screen remain in the current browser session.</div>
      </aside>
    </main>
  );
}

function statusStyle(status: string): CSSProperties {
  const normalized = status.toUpperCase();
  const color = normalized === "COMPLETED" ? "#147d55"
    : normalized === "FAILED" || normalized === "BLOCKED" ? "#b42318"
      : normalized === "SKIPPED" ? "#8a5a00" : "#475467";
  const background = normalized === "COMPLETED" ? "#e8f7ef"
    : normalized === "FAILED" || normalized === "BLOCKED" ? "#fff0ef"
      : normalized === "SKIPPED" ? "#fff5d6" : "#eef1f5";
  return { color, background, borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" };
}

const styles: Record<string, CSSProperties> = {
  shell: { minHeight: "100vh", display: "grid", gridTemplateColumns: "250px minmax(0, 1fr) 260px", background: "#f6f7fb", color: "#202433", fontFamily: "Arial, sans-serif" },
  sidebar: { padding: 20, background: "#151a2a", color: "#f8fafc", display: "flex", flexDirection: "column", gap: 8, minHeight: "100vh", boxSizing: "border-box" },
  brand: { color: "#fff", textDecoration: "none", fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  subBrand: { color: "#8790a8", fontSize: 10, fontWeight: 800, letterSpacing: 2, marginTop: 2, marginBottom: 18 },
  managerCard: { display: "flex", gap: 10, alignItems: "center", padding: 12, borderRadius: 12, border: "1px solid #3a425a", background: "#222940", marginBottom: 14 },
  managerIcon: { display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "#c7d2fe", color: "#3730a3", fontSize: 20 },
  muted: { color: "#8b93a8", fontSize: 12, lineHeight: 1.5 },
  onlineDot: { width: 8, height: 8, borderRadius: "50%", background: "#45d49b", marginLeft: "auto" },
  sectionTitle: { display: "flex", justifyContent: "space-between", color: "#8b93a8", fontSize: 10, fontWeight: 800, letterSpacing: 1.2, margin: "12px 0 8px" },
  agent: { display: "flex", alignItems: "center", gap: 9, padding: "10px 6px", borderBottom: "1px solid #292f43" },
  agentAvatar: { display: "grid", placeItems: "center", flex: "0 0 30px", width: 30, height: 30, borderRadius: 9, background: "#2e3650", color: "#c7d2fe", fontWeight: 800, fontSize: 12 },
  agentText: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1, fontSize: 12 },
  ready: { color: "#64d9a8", fontSize: 10 },
  emptyAgents: { color: "#9ba3b8", fontSize: 12, lineHeight: 1.8, padding: "12px 4px" },
  sidebarBottom: { marginTop: "auto", paddingTop: 18 },
  navLink: { display: "block", color: "#d8deff", fontSize: 12, fontWeight: 700, textDecoration: "none", padding: "10px 0" },
  privacyNote: { color: "#7e879f", fontSize: 10, lineHeight: 1.6, borderTop: "1px solid #2a3044", paddingTop: 12 },
  main: { display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh", borderRight: "1px solid #e5e7ef" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: "24px 28px", background: "#fff", borderBottom: "1px solid #e9ebf2" },
  eyebrow: { color: "#777f96", fontSize: 10, fontWeight: 800, letterSpacing: 1.3, marginBottom: 9 },
  title: { margin: 0, fontSize: 24, letterSpacing: -0.8 },
  subtitle: { margin: "8px 0 0", color: "#777f96", fontSize: 12, lineHeight: 1.6 },
  manageButton: { color: "#39415b", background: "#fff", border: "1px solid #dfe3ee", borderRadius: 9, padding: "10px 12px", textDecoration: "none", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700 },
  conversation: { flex: 1, padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, minHeight: 300 },
  welcome: { maxWidth: 600, margin: "auto", textAlign: "center", padding: "30px 12px" },
  sparkle: { margin: "0 auto 18px", display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 15, background: "#e8eaff", color: "#5455bd", fontSize: 26 },
  welcomeTitle: { fontSize: 25 },
  examples: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 22 },
  example: { padding: "11px 13px", border: "1px solid #e1e4ed", borderRadius: 10, background: "#fff", color: "#39415b", cursor: "pointer", fontSize: 11, fontWeight: 700 },
  userMessage: { alignSelf: "flex-end", maxWidth: "88%", minWidth: "30%", background: "#4448a8", color: "#fff", borderRadius: "15px 15px 4px 15px", padding: 15, whiteSpace: "pre-wrap" },
  teamMessage: { alignSelf: "stretch", maxWidth: "100%", background: "#fff", border: "1px solid #e7e9f1", borderRadius: "14px 14px 14px 4px", padding: 16, boxShadow: "0 5px 18px rgba(27,35,70,.03)" },
  messageLabel: { fontSize: 9, fontWeight: 800, letterSpacing: 1.2, opacity: 0.65, marginBottom: 7 },
  messageText: { fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" },
  stageCard: { marginTop: 12, padding: 12, border: "1px solid #e8eaf2", borderRadius: 11, background: "#fbfcff" },
  stageTop: { display: "flex", alignItems: "center", gap: 10 },
  stageIcon: { display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, background: "#e8eaff", color: "#4b4fb1", fontWeight: 900 },
  stageName: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, fontSize: 12 },
  stageResponse: { fontSize: 12, lineHeight: 1.65, color: "#4d556b", whiteSpace: "pre-wrap", margin: "12px 0 4px" },
  stageError: { fontSize: 12, lineHeight: 1.6, color: "#b42318", margin: "10px 0 2px" },
  taskLink: { display: "inline-block", fontSize: 10, color: "#5c60b8", textDecoration: "none", marginTop: 8 },
  running: { fontSize: 12, color: "#626b83", display: "flex", alignItems: "center", gap: 8 },
  spinner: { fontSize: 20, color: "#5455bd" },
  error: { margin: "0 28px 12px", padding: 12, borderRadius: 9, color: "#9e2424", background: "#fff0ef", fontSize: 12 },
  warning: { margin: "0 28px 10px", padding: 10, borderRadius: 9, color: "#835700", background: "#fff5d6", fontSize: 12 },
  composer: { position: "relative", display: "flex", alignItems: "flex-end", gap: 10, padding: "18px 28px 34px", background: "#fff", borderTop: "1px solid #e9ebf2" },
  textarea: { flex: 1, resize: "vertical", minHeight: 48, maxHeight: 180, border: "1px solid #dfe3ee", borderRadius: 12, padding: 13, font: "13px Arial, sans-serif", outline: "none", color: "#202433", background: "#fbfcff" },
  sendButton: { display: "flex", alignItems: "center", gap: 10, border: 0, borderRadius: 10, padding: "14px 16px", background: "#4448a8", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 12 },
  composerHint: { position: "absolute", bottom: 13, left: 29, color: "#a0a5b5", fontSize: 9 },
  tasksSidebar: { padding: 18, background: "#fbfcff", minHeight: "100vh", boxSizing: "border-box" },
  taskItem: { display: "flex", alignItems: "flex-start", gap: 9, padding: "12px 0", borderBottom: "1px solid #e9ebf2" },
  taskStatusDot: { width: 7, height: 7, borderRadius: "50%", background: "#686cc6", marginTop: 5, flexShrink: 0 },
  taskItemText: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  taskItemTitle: { fontSize: 11 },
  taskFooter: { marginTop: 24, fontSize: 10, color: "#9399aa", lineHeight: 1.6 },
  center: { padding: 40, fontFamily: "Arial, sans-serif" },
};
