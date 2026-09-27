"use client";

import { apiFetch } from "../../lib/auth";
import { useEffect, useState } from "react";

export default function Memory() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    apiFetch("/memory/agent-demo").then((response) => response.json()).then(setRows).catch(() => {});
  }, []);
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Arial", padding: 24 }}>
      <h1>Work Memory</h1><p>Professional context only.</p>
      {rows.map((row) => <div key={row.id} style={{ padding: 14, border: "1px solid #ddd", margin: "8px 0" }}><small>{row.scope}</small><p>{row.content}</p></div>)}
    </main>
  );
}
