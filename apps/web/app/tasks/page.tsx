"use client";
import {useEffect,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";
export default function Tasks(){
 const [tasks,setTasks]=useState<any[]>([]); const [title,setTitle]=useState(""); const [busy,setBusy]=useState(false);
 const load=()=>fetch(API+"/tasks/company/company-demo").then(r=>r.json()).then(setTasks);
 useEffect(()=>{load().catch(()=>{});},[]);
 async function create(){
  if(!title.trim()) return; setBusy(true);
  await fetch(API+"/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({companyId:"company-demo",title,description:"Created from workspace"})});
  setTitle("");setBusy(false);load();
 }
 return <main style={{maxWidth:1000,margin:"40px auto",fontFamily:"Arial",padding:24}}>
  <h1>Tasks</h1><p>Work delegated to people and AI teammates.</p>
  <div style={{display:"flex",gap:8}}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New task" style={{flex:1,padding:10}}/><button disabled={busy} onClick={create}>Create</button></div>
  <section style={{marginTop:24}}>{tasks.map(t=><article key={t.id} style={{padding:14,border:"1px solid #ddd",marginBottom:8}}><b>{t.title}</b><div>{t.status}</div><small>{t.description}</small></article>)}</section>
 </main>;
}