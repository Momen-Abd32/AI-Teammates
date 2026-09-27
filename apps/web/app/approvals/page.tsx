"use client";
import {useEffect,useState} from "react";
import {apiFetch} from "../../lib/auth";

type Approval={id:string;action:string;reason:string;status:"PENDING"|"APPROVED"|"REJECTED";agentId:string;executionId?:string;taskId?:string;};

export default function Approvals(){
 const [items,setItems]=useState<Approval[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 async function load(){
  setLoading(true);
  const auth=await apiFetch("/auth/validate",{method:"POST"});
  if(!auth.ok){setError("Session expired");setLoading(false);return;}
  const response=await apiFetch("/approvals");
  if(!response.ok){setError("Failed to load approvals");setLoading(false);return;}
  setItems(await response.json());setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 async function decide(id:string,status:"APPROVED"|"REJECTED"){
  setError("");
  const response=await apiFetch("/approvals/"+id,{
   method:"PATCH",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({status}),
  });
  if(response.ok)void load(); else setError("Failed to update approval");
 }
 return <main style={styles.page}>
  <h1>Approvals</h1><p style={styles.muted}>Sensitive actions require human approval.</p>
  {error&&<p style={styles.error}>{error}</p>}
  {loading?<p>Loading…</p>:!items.length?<p style={styles.empty}>No approval requests.</p>:items.map(x=><article key={x.id} style={styles.card}>
   <div style={styles.header}><div><b>{x.action}</b><p>{x.reason}</p></div><strong>{x.status}</strong></div>
   {x.taskId&&<small style={styles.meta}>Task: {x.taskId}</small>}
   {x.executionId&&<small style={styles.meta}>Execution: {x.executionId}</small>}
   {x.status==="PENDING"&&<div style={styles.actions}>
    <button onClick={()=>decide(x.id,"APPROVED")}>Approve</button>
    <button onClick={()=>decide(x.id,"REJECTED")}>Reject</button>
   </div>}
  </article>)}
 </main>;
}
const styles:any={
 page:{maxWidth:900,margin:"40px auto",fontFamily:"Arial",padding:24},
 muted:{color:"#777"},error:{color:"#b00020"},empty:{color:"#888"},
 card:{padding:16,border:"1px solid #ddd",margin:"10px 0",borderRadius:8},
 header:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start"},
 meta:{display:"block",color:"#777",marginTop:4},
 actions:{display:"flex",gap:8,marginTop:12}
};