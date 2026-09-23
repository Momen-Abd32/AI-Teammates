"use client";
import {useState} from "react";
import {setToken} from "../../lib/auth";

const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";

export default function Login(){
 const [mode,setMode]=useState<"login"|"register">("login");
 const [form,setForm]=useState({companyName:"",name:"",email:"",password:""});
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 async function submit(){
  setBusy(true);setError("");
  const endpoint=mode==="login"?"/auth/login":"/auth/register-company";
  const body=mode==="login"
    ?{email:form.email,password:form.password}
    :form;
  try{
   const r=await fetch(API+endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const data=await r.json();
   if(!r.ok) throw new Error(data.message??"Authentication failed");
   setToken(data.accessToken);
   window.location.href="/dashboard";
  }catch(e){setError(e instanceof Error?e.message:"Authentication failed");}
  finally{setBusy(false);}
 }

 return <main style={{maxWidth:460,margin:"80px auto",fontFamily:"Arial",padding:24}}>
  <h1>AI Teammates</h1><p>{mode==="login"?"Sign in to your workspace":"Create a company workspace"}</p>
  {mode==="register"&&<><input placeholder="Company name" value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})} style={{display:"block",width:"100%",padding:12,margin:"8px 0"}}/><input placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{display:"block",width:"100%",padding:12,margin:"8px 0"}}/></>}
  <input placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{display:"block",width:"100%",padding:12,margin:"8px 0"}}/>
  <input placeholder="Password (10+ characters)" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{display:"block",width:"100%",padding:12,margin:"8px 0"}}/>
  {error&&<p style={{color:"crimson"}}>{error}</p>}
  <button disabled={busy} onClick={submit} style={{padding:"10px 18px"}}>{busy?"Please wait…":mode==="login"?"Sign in":"Create workspace"}</button>
  <button onClick={()=>setMode(mode==="login"?"register":"login")} style={{marginLeft:10,padding:"10px 18px"}}>{mode==="login"?"Create account":"Back to sign in"}</button>
 </main>;
}
