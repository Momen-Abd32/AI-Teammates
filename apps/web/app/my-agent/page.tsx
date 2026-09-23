"use client";
import {useEffect,useMemo,useState} from "react";
import {apiFetch} from "../../lib/auth";

type Conversation={id:string;agentId:string;title:string;updatedAt:string};
type Message={id:string;sender:"USER"|"AGENT"|"SYSTEM";content:string;createdAt:string};
type Agent={id:string;employeeId:string;role:string};

export default function MyAgent(){
  const [user,setUser]=useState<any>(null);
  const [agents,setAgents]=useState<Agent[]>([]);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [active,setActive]=useState<Conversation|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");

  const activeAgent=useMemo(()=>agents.find(a=>a.id===active?.agentId),[agents,active]);

  async function load(){
    setError("");
    const auth=await apiFetch("/auth/validate",{method:"POST"});
    if(!auth.ok){window.location.href="/login";return;}
    const me=await auth.json();
    setUser(me);
    const [agentRes,convRes]=await Promise.all([
      apiFetch("/organization/companies/"+me.companyId+"/agents"),
      apiFetch("/conversations"),
    ]);
    if(!agentRes.ok||!convRes.ok){setError("Could not load your workspace.");return;}
    const allAgents=await agentRes.json();
    const allConversations=await convRes.json();
    const mine=allAgents.filter((a:Agent)=>a.employeeId===me.employeeId);
    setAgents(mine);
    setConversations(allConversations);
    if(allConversations.length) await openConversation(allConversations[0],false);
    else if(mine.length) await newConversation(mine[0].id,false);
    setLoading(false);
  }

  async function openConversation(conversation:Conversation,replace=true){
    setActive(conversation);
    const r=await apiFetch("/conversations/"+conversation.id+"/messages");
    if(r.ok)setMessages(await r.json());
    if(replace) setError("");
  }

  async function newConversation(agentId=activeAgent?.id,select=true){
    if(!agentId)return;
    const r=await apiFetch("/conversations",{method:"POST",body:JSON.stringify({agentId})});
    if(!r.ok){setError("Could not create conversation.");return;}
    const c=await r.json();
    setConversations(prev=>[c,...prev]);
    if(select){setActive(c);setMessages([]);}
    return c;
  }

  async function send(){
    if(!input.trim()||!activeAgent||sending)return;
    let conversation=active;
    if(!conversation) conversation=await newConversation(activeAgent.id);
    if(!conversation)return;
    const text=input.trim();
    setInput("");setSending(true);setError("");
    setMessages(prev=>[...prev,{id:"local-"+Date.now(),sender:"USER",content:text,createdAt:new Date().toISOString()}]);
    const r=await apiFetch("/agents/chat",{method:"POST",body:JSON.stringify({
      agentId:activeAgent.id,employeeId:user.employeeId,companyId:user.companyId,
      conversationId:conversation.id,message:text
    })});
    if(!r.ok){setError("Agent request failed.");setSending(false);return;}
    const result=await r.json();
    setMessages(prev=>[...prev,{id:"agent-"+Date.now(),sender:"AGENT",content:result.response??"",createdAt:new Date().toISOString()}]);
    const refreshed=await apiFetch("/conversations");
    if(refreshed.ok)setConversations(await refreshed.json());
    setSending(false);
  }

  useEffect(()=>{load();},[]);

  if(loading)return <main style={styles.center}>Loading your workspace…</main>;

  return <main style={styles.shell}>
    <aside style={styles.sidebar}>
      <div style={styles.brand}>AI Teammates<div style={styles.muted}>Personal AI workforce</div></div>
      <button style={styles.newButton} onClick={()=>newConversation()}>＋ New conversation</button>
      <div style={styles.section}>CONVERSATIONS</div>
      <div style={styles.list}>
        {conversations.map(c=><button key={c.id} onClick={()=>openConversation(c)} style={{...styles.conversation,...(active?.id===c.id?styles.active:{})}}>
          <span>{c.title}</span><small>{new Date(c.updatedAt).toLocaleDateString()}</small>
        </button>)}
        {!conversations.length&&<div style={styles.muted}>No conversations yet.</div>}
      </div>
      <div style={styles.user}>{user?.role}<br/><span>{user?.employeeId}</span></div>
    </aside>
    <section style={styles.chat}>
      <header style={styles.header}>
        <div><b>{activeAgent?.role??"My Agent"}</b><div style={styles.muted}>{active?.title??"Start a new conversation"}</div></div>
        <button style={styles.secondary} onClick={()=>newConversation()}>New chat</button>
      </header>
      <div style={styles.messages}>
        {!messages.length&&<div style={styles.empty}><h2>Your AI teammate</h2><p>Ask your agent to help with code, tasks, analysis, documentation or your daily engineering work.</p></div>}
        {messages.map(m=><div key={m.id} style={{...styles.bubbleWrap,justifyContent:m.sender==="USER"?"flex-end":"flex-start"}}><div style={{...styles.bubble,...(m.sender==="USER"?styles.userBubble:{})}}><div style={styles.sender}>{m.sender}</div>{m.content}</div></div>)}
        {sending&&<div style={styles.typing}>Agent is working…</div>}
      </div>
      {error&&<div style={styles.error}>{error}</div>}
      <div style={styles.composer}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message your AI teammate…" /><button onClick={send} disabled={sending||!input.trim()}>Send</button></div>
    </section>
  </main>;
}
const styles:any={
shell:{display:"flex",height:"100vh",fontFamily:"Arial,sans-serif",background:"#f7f7f8",color:"#171717"},
sidebar:{width:300,borderRight:"1px solid #ddd",background:"#fff",padding:18,display:"flex",flexDirection:"column",boxSizing:"border-box"},
brand:{fontSize:20,fontWeight:700,marginBottom:20},muted:{fontSize:12,color:"#777",marginTop:4},
newButton:{border:"0",borderRadius:10,padding:"12px 14px",background:"#171717",color:"#fff",cursor:"pointer",fontWeight:700},
section:{fontSize:11,fontWeight:700,color:"#888",margin:"24px 4px 10px"},list:{overflowY:"auto",flex:1},
conversation:{width:"100%",textAlign:"left",border:"0",background:"transparent",padding:"12px",borderRadius:9,cursor:"pointer",display:"flex",justifyContent:"space-between",marginBottom:3},
active:{background:"#eee"},user:{borderTop:"1px solid #eee",paddingTop:14,fontSize:13},chat:{flex:1,display:"flex",flexDirection:"column",minWidth:0},
header:{height:72,borderBottom:"1px solid #ddd",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px"},
secondary:{border:"1px solid #ccc",background:"#fff",borderRadius:8,padding:"8px 12px",cursor:"pointer"},messages:{flex:1,overflowY:"auto",padding:24},
empty:{maxWidth:600,margin:"80px auto",textAlign:"center",color:"#555"},bubbleWrap:{display:"flex",marginBottom:14},bubble:{maxWidth:"75%",background:"#fff",border:"1px solid #ddd",borderRadius:14,padding:"12px 15px",whiteSpace:"pre-wrap",lineHeight:1.5},userBubble:{background:"#171717",color:"#fff",borderColor:"#171717"},sender:{fontSize:10,fontWeight:700,opacity:.65,marginBottom:4},typing:{fontSize:13,color:"#777",padding:10},error:{color:"#b00020",padding:"0 24px 10px"},
composer:{display:"flex",gap:10,padding:18,background:"#fff",borderTop:"1px solid #ddd"},textarea:{flex:1,minHeight:50,resize:"vertical",border:"1px solid #ccc",borderRadius:10,padding:12,fontFamily:"inherit"},button:{border:0,borderRadius:10,padding:"0 20px",background:"#171717",color:"#fff",cursor:"pointer"}
};
