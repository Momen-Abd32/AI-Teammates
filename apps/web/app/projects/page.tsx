"use client";
import {useEffect,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";
export default function Projects(){
 const [projects,setProjects]=useState<any[]>([]); const [name,setName]=useState("");
 const load=()=>fetch(API+"/projects/company/company-demo").then(r=>r.json()).then(setProjects);
 useEffect(()=>{load().catch(()=>{});},[]);
 async function create(){if(!name.trim())return;await fetch(API+"/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({companyId:"company-demo",name})});setName("");load();}
 return <main style={{maxWidth:1000,margin:"40px auto",fontFamily:"Arial",padding:24}}>
  <h1>Projects</h1><div style={{display:"flex",gap:8}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" style={{flex:1,padding:10}}/><button onClick={create}>Create</button></div>
  <div style={{marginTop:24}}>{projects.map(p=><div key={p.id} style={{padding:14,border:"1px solid #ddd",marginBottom:8}}><b>{p.name}</b></div>)}</div>
 </main>;
}