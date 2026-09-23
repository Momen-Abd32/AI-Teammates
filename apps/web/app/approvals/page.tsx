"use client";
import {useEffect,useState} from "react";
import {apiFetch} from "../../lib/auth";

type Approval={id:string;action:string;reason:string;status:"PENDING"|"APPROVED"|"REJECTED";agentId:string;};

export default function Approvals(){
 const [items,setItems]=useState<Approval[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 async function load(){
  setLoading(true);
  const auth=await apiFetch("/auth/validate",{method:"POST"});
  if(!auth.ok){setError("Session expired");setLoading(false);return;}
  const user=await auth.json();
  const response=await apiFetch("/approvals/company/"+user.companyId);
  if(!response.ok){setError("Failed to load approvals");setLoading(false);return;}
  setItems(await response.json());setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 async function decide(id:string,status:"APPROVED"|"REJECTED"){
  const auth=await apiFetch("/auth/validate",{method:"POST"});
  if(!auth.ok)return;
  const response=await apiFetch("/approvals/"+id,{method:"PATCH",body:JSON.stringify({status})});
  if(response.ok)void load(); else setError("Failed to update approval");
 }
 return <main style={styles.page}>
  <h1>Approvals</h1><p style={styles.muted}>Sensitive actions require human approval.</p>
  {error&&<p style={styles.error}>{error}</p>}
  {loading?<p>Loading…</p>:!items.length?<p style={styles.empty}>No approval requests.</p>:items.map(x=><article key={x.id} style={styles.card}>
   <b>{x.action}</b><p>{x.reason}</p><strong>{x.status}</strong>
   {x.status==="PENDING"&&<div style={styles.actions}>
    <button onClick={()=>decide(x.id,"APPROVED")}>Approve</button>
    <button onClick={()=>decide(x.id,"REJECTED")}>Reject</button>
   </div>}
  </article>)}
 </main>;
}
const styles:any={page:{maxWidth:900,margin:"40px auto",fontFamily:"Arial",padding:24},muted:{color:"#777"},error:{color:"#b00020"},empty:{color:"#888"},card:{padding:16,border:"1px solid #ddd",margin:"10px 0",borderRadius:8},actions:{display:"flex",gap:8,marginTop:12}};
