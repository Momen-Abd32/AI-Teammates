"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api") +
          "/agents/chat",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            agentId: "agent-demo",
            employeeId: "employee-demo",
            companyId: "company-demo",
            role: "full_stack_developer",
            message,
          }),
        },
      );
      const data = await res.json();
      setResponse(data.response ?? data.message ?? "No response");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>AI Teammates</h1>
      <p>Your personal work AI teammate.</p>
      <form onSubmit={send}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask your agent about your work..."
          rows={6}
          style={{ width: "100%", padding: 16 }}
        />
        <button disabled={loading} style={{ marginTop: 12, padding: "10px 18px" }}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
      {response && (
        <section style={{ marginTop: 32 }}>
          <h2>Agent</h2>
          <p>{response}</p>
        </section>
      )}
    </main>
  );
}
