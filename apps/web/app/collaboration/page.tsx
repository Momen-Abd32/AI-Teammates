"use client";
import{useEffect,useState}from"react";
import{apiFetch}from"../../lib/auth";

type Task={id:string;title:string;description:string;status:string;assignedAgentId?:string;};
export default function Collaboration(){
 const[tasks,setTasks]=useState<Task[]>([]);
 const[error,setError]=useState("");
 useEffect(()=>{(async()=>{const a=await apiFetch("/auth/validate",{method:"POST"});if(!a.ok)return;const u=await a.json();const r=await apiFetch("/tasks/company/"+u.companyId);if(r.ok)setTasks(await r.json());else setError("Failed to load tasks");})()},[]);
 return <main style={styles.page}><h1>Agent Collaboration</h1><p style={styles.muted}>Tasks delegated between AI teammates and their current state.</p>{error&&<p>{error}</p>}{!tasks.length?<p style={styles.empty}>No delegated tasks yet.</p>:tasks.map(t=><article key={t.id} style={styles.card}><div style={styles.row}><b>{t.title}</b><span>{t.status}</span></div><p>{t.description}</p><small>Task {t.id} · Agent {t.assignedAgentId??"unassigned"}</small></article>)}</main>
}
const styles:any={page:{maxWidth:950,margin:"40px auto",padding:24,fontFamily:"Arial"},muted:{color:"#777"},empty:{color:"#888"},card:{border:"1px solid #ddd",borderRadius:8,padding:16,margin:"10px 0"},row:{display:"flex",justifyContent:"space-between",gap:20},};
