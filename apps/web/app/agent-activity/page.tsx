import {apiFetch} from "../../lib/auth";
"use client";
import {useEffect,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";
export default function AgentActivity(){
 const [events,setEvents]=useState<any[]>([]);
 useEffect(()=>{apiFetch("/audit/company/company-demo").then(r=>r.json()).then(setEvents).catch(()=>{});},[]);
 return <main style={{maxWidth:1000,margin:"40px auto",fontFamily:"Arial",padding:24}}>
  <h1>Agent Activity</h1><p>Auditable actions performed by AI teammates.</p>
  {events.map(e=><article key={e.id} style={{padding:14,border:"1px solid #ddd",marginBottom:8}}>
   <b>{e.action}</b><div>Agent: {e.agentId??"—"} · Employee: {e.actorId??"—"}</div><small>{e.createdAt}</small>
  </article>)}
 </main>;
}