"use client";

import { FormEvent, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [agent, setAgent] = useState<{id:string; role:string; permissions:string[]} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(API + "/agents/demo").then(r => r.json()).then(setAgent).catch(() => undefined);
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(API + "/agents/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: agent?.id ?? "agent-demo",
          employeeId: "employee-demo",
          companyId: "company-demo",
          role: agent?.role ?? "full_stack_developer",
          message,
        }),
      });
      const data = await res.json();
      setResponse(data.response ?? "No response");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{maxWidth: 800, margin: "60px auto", padding: 24, fontFamily: "Arial"}}>
      <h1>AI Teammates</h1>
      <p>Personal work AI teammate</p>
      {agent && <small>Agent: {agent.id} · {agent.role}</small>}
      <form onSubmit={send} style={{marginTop: 24}}>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Tell your AI teammate what you need..." rows={6}
          style={{width:"100%", padding:16, boxSizing:"border-box"}} />
        <button disabled={loading} style={{marginTop:12, padding:"10px 20px"}}>
          {loading ? "Working..." : "Send"}
        </button>
      </form>
      {response && <section style={{marginTop:32, padding:20, border:"1px solid #ddd"}}>
        <h2>Agent response</h2><p>{response}</p>
      </section>}
    </main>
  );
}
