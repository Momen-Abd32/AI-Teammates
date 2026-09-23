"use client";
import {useEffect,useState} from "react";
import {apiFetch,getToken} from "../../lib/auth";

type Activity={id:string;type:string;agentId?:string;conversationId?:string;message?:string;timestamp:string};

export default function AgentActivity(){
 const [events,setEvents]=useState<Activity[]>([]);
 const [connected,setConnected]=useState(false);

 useEffect(()=>{
  let socket:WebSocket|undefined;
  let cancelled=false;
  async function connect(){
   const auth=await apiFetch("/auth/validate",{method:"POST"});
   if(!auth.ok)return;
   const token=getToken();
   if(!token||cancelled)return;
   const wsBase=API.replace(/^http/,"ws");
   socket=new WebSocket(wsBase+"/activity?token="+encodeURIComponent(token));
   socket.onopen=()=>setConnected(true);
   socket.onclose=()=>setConnected(false);
   socket.onerror=()=>setConnected(false);
   socket.onmessage=e=>{
    try{
     const event=JSON.parse(e.data) as Activity;
     if(event.type==="activity.connected")return;
     setEvents(prev=>[event,...prev].slice(0,100));
    }catch{}
   };
  }
  connect();
  return ()=>{cancelled=true;socket?.close();};
 },[]);

 return <main style={styles.page}>
  <header style={styles.header}>
   <div><h1 style={styles.title}>Agent Activity</h1><p style={styles.muted}>Live activity from your AI teammate.</p></div>
   <span style={{...styles.status,color:connected?"#16803c":"#888"}}>{connected?"● Live":"○ Offline"}</span>
  </header>
  {!events.length&&<div style={styles.empty}>Waiting for agent activity…</div>}
  {events.map(e=><article key={e.id} style={styles.event}>
   <div style={styles.dot}></div>
   <div style={{flex:1}}>
    <b>{label(e.type)}</b>
    {e.message&&<div style={styles.message}>{e.message}</div>}
    <div style={styles.meta}>{e.agentId??"Agent"} · {new Date(e.timestamp).toLocaleTimeString()}</div>
   </div>
  </article>)}
 </main>;
}

function label(type:string){
 const labels:Record<string,string>={
  "agent.started":"Agent started",
  "memory.retrieved":"Memory retrieved",
  "tool.started":"Tool started",
  "tool.completed":"Tool completed",
  "agent.delegated":"Task delegated",
  "approval.required":"Human approval required",
  "agent.completed":"Agent completed",
  "agent.failed":"Agent failed",
 };
 return labels[type]??type;
}

const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";
const styles:any={
 page:{maxWidth:900,margin:"0 auto",padding:"40px 24px",fontFamily:"Arial,sans-serif",color:"#171717"},
 header:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28},
 title:{margin:0,fontSize:30},muted:{color:"#777",marginTop:6},status:{fontSize:13,fontWeight:700},
 event:{display:"flex",gap:14,alignItems:"flex-start",padding:"16px 0",borderBottom:"1px solid #eee"},
 dot:{width:9,height:9,borderRadius:"50%",background:"#171717",marginTop:7,flexShrink:0},
 message:{marginTop:5,color:"#555"},meta:{fontSize:12,color:"#999",marginTop:7},
 empty:{padding:"60px 20px",textAlign:"center",color:"#888"}
};
