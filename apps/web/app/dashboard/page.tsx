"use client";
import {useEffect,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";
export default function Dashboard(){const[h,setH]=useState<any>();const[t,setT]=useState<any[]>([]);
useEffect(()=>{fetch(API+"/health").then(r=>r.json()).then(setH);fetch(API+"/tasks/company/company-demo").then(r=>r.json()).then(setT).catch(()=>{});},[]);
return <main style={{maxWidth:1000,margin:"40px auto",fontFamily:"Arial",padding:24}}><h1>AI Teammates</h1><p>Company workspace · Personal AI workforce</p><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}><div>System<br/><b>{h?.status??"Loading"}</b></div><div>Database<br/><b>{h?.checks?.database??"—"}</b></div><div>Redis<br/><b>{h?.checks?.redis??"—"}</b></div></div><h2>Tasks</h2>{t.map(x=><div key={x.id} style={{padding:12,border:"1px solid #ddd",margin:"8px 0"}}><b>{x.title}</b> · {x.status}</div>)}</main>}