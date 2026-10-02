"use client";
import {useEffect,useMemo,useState} from "react";
import {apiFetch} from "../../lib/auth";

type Conversation={id:string;agentId:string;title:string;updatedAt:string};
type Message={id:string;sender:"USER"|"AGENT"|"SYSTEM";content:string;createdAt:string};
type Agent={id:string;employeeId:string;role:string;permissions?:string[];aiProvider?:string;aiModel?:string};

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
  const [routerMode,setRouterMode]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [newRole,setNewRole]=useState("");
  const [newProvider,setNewProvider]=useState("openai");
  const [newModel,setNewModel]=useState("");

  const activeAgent=useMemo(()=>agents.find(a=>a.id===active?.agentId),[agents,active]);

  async function load(){
    setError("");
    const auth=await apiFetch("/auth/validate",{method:"POST"});
    if(!auth.ok){window.location.href="/login";return;}
    const me=await auth.json();
    setUser(me);

    const [agentRes,convRes]=await Promise.all([
      apiFetch("/organization/my-agents"),
      apiFetch("/conversations"),
    ]);
    if(!agentRes.ok||!convRes.ok){setError("Could not load your workspace.");setLoading(false);return;}

    const mine=await agentRes.json();
    const allConversations=await convRes.json();
    setAgents(mine);
    setConversations(allConversations);

    const firstConversation=allConversations.find((c:Conversation)=>mine.some((a:Agent)=>a.id===c.agentId));
    if(firstConversation) await openConversation(firstConversation,false);
    else if(mine.length) await newConversation(mine[0].id,false);

    setLoading(false);
  }

  async function openConversation(conversation:Conversation,replace=true){
    if(!agents.some(a=>a.id===conversation.agentId)) return;
    setActive(conversation);
    const r=await apiFetch("/conversations/"+conversation.id+"/messages");
    if(r.ok)setMessages(await r.json());
    if(replace)setError("");
  }

  async function newConversation(agentId=activeAgent?.id,select=true){
    if(!agentId)return;
    const r=await apiFetch("/conversations",{method:"POST",body:JSON.stringify({agentId})});
    if(!r.ok){setError("Could not create conversation.");return;}
    const c=await r.json();
    setConversations(prev=>[c,...prev]);
    if(select){setActive(c);setMessages([]);setError("");}
    return c;
  }

  async function createAgent(){
    if(!newRole.trim())return;
    const r=await apiFetch("/organization/my-agents",{method:"POST",body:JSON.stringify({role:newRole.trim(),aiProvider:newProvider,aiModel:newModel.trim()||undefined})});
    if(!r.ok){setError("Could not create AI teammate.");return;}
    const created=await r.json();
    setAgents(prev=>[...prev,created]);setShowCreate(false);setNewRole("");setNewModel("");
    await newConversation(created.id);
  }

  async function selectAgent(agentId:string){
    const existing=conversations.find(c=>c.agentId===agentId);
    if(existing){await openConversation(existing);return;}
    await newConversation(agentId);
  }

  async function send(){
    if(!input.trim()||!activeAgent||sending)return;
    let conversation=active;
    if(!conversation) conversation=await newConversation(activeAgent.id);
    if(!conversation)return;
    const text=input.trim();
    setInput("");setSending(true);setError("");
    setMessages(prev=>[...prev,{id:"local-"+Date.now(),sender:"USER",content:text,createdAt:new Date().toISOString()}]);
    const r=routerMode
      ? await apiFetch("/orchestrator/route",{method:"POST",body:JSON.stringify({
          senderAgentId:activeAgent.id,conversationId:conversation.id,title:text.slice(0,80),description:text
        })})
      : await apiFetch("/agents/act",{method:"POST",body:JSON.stringify({
          agentId:activeAgent.id,conversationId:conversation.id,message:text
        })});
    if(!r.ok){setError(routerMode?"Could not route task to an AI teammate.":"Agent request failed.");setSending(false);return;}
    const result=await r.json();
    if(routerMode && result.task){
      const routedRole=result.task.assignedAgentId;
      setMessages(prev=>[...prev,{id:"route-"+Date.now(),sender:"SYSTEM",content:`Task routed to ${routedRole}.`,createdAt:new Date().toISOString()}]);
    }
    if(result.status==="WAITING_FOR_HUMAN"){
      const action=result.approval?.action??result.execution?.action??"sensitive action";
      setMessages(prev=>[...prev,{id:"approval-"+Date.now(),sender:"SYSTEM",content:`Human approval required for: ${action}. Open Approvals to continue.`,createdAt:new Date().toISOString()}]);
    }else if(result.response){
      setMessages(prev=>[...prev,{id:"agent-"+Date.now(),sender:"AGENT",content:result.response,createdAt:new Date().toISOString()}]);
    }else if(result.result){
      setMessages(prev=>[...prev,{id:"tool-"+Date.now(),sender:"AGENT",content:`Tool completed: ${JSON.stringify(result.result,null,2)}`,createdAt:new Date().toISOString()}]);
    }
    const refreshed=await apiFetch("/conversations");
    if(refreshed.ok)setConversations(await refreshed.json());
    setSending(false);
  }

  useEffect(()=>{load();},[]);

  if(loading)return <main style={styles.center}>Loading your workspace…</main>;

  return <main style={styles.shell}>
    <aside style={styles.sidebar}>
      <div style={styles.brand}>AI Teammates<div style={styles.muted}>Your personal AI workforce</div></div>

      <div style={styles.section}>YOUR AGENTS</div>
      <div style={styles.agentList}>
        {agents.map(agent=><button key={agent.id} onClick={()=>selectAgent(agent.id)}
          style={{...styles.agentCard,...(activeAgent?.id===agent.id?styles.agentActive:{})}}>
          <span style={styles.agentDot}>●</span>
          <span><b>{agent.role}</b><small style={styles.agentCardSmall}>{agent.aiProvider??"openai"}{agent.aiModel?` · ${agent.aiModel}`:""} · {agent.permissions?.length??0} permissions</small></span>
        </button>)}
        {!agents.length&&<div style={styles.muted}>No agents assigned yet.</div>}
      </div>

      <button style={styles.newButton} onClick={()=>setShowCreate(v=>!v)}>＋ Add AI teammate</button>
      {showCreate&&<div style={styles.createBox}>
        <input value={newRole} onChange={e=>setNewRole(e.target.value)} placeholder="Agent role (e.g. Coding Agent)" style={styles.input}/>
        <select value={newProvider} onChange={e=>{setNewProvider(e.target.value);setNewModel("");}} style={styles.input}>
          <option value="openai">OpenAI / ChatGPT</option><option value="anthropic">Anthropic / Claude</option><option value="gemini">Google / Gemini</option>
        </select>
        <input value={newModel} onChange={e=>setNewModel(e.target.value)} placeholder="Model (optional)" style={styles.input}/>
        <button style={styles.newButton} onClick={createAgent}>Create</button>
      </div>}
      <div style={styles.section}>CONVERSATIONS</div>
      <div style={styles.list}>
        {conversations.filter(c=>agents.some(a=>a.id===c.agentId)).map(c=><button key={c.id} onClick={()=>openConversation(c)}
          style={{...styles.conversation,...(active?.id===c.id?styles.active:{})}}>
          <span>{c.title}</span><small>{agents.find(a=>a.id===c.agentId)?.role??"Agent"}</small>
        </button>)}
        {!conversations.length&&<div style={styles.muted}>No conversations yet.</div>}
      </div>
      <div style={styles.user}>{user?.role}<br/><span>{user?.employeeId}</span></div>
    </aside>

    <section style={styles.chat}>
      <header style={styles.header}>
        <div><b>{activeAgent?.role??"Select an AI teammate"}</b><div style={styles.muted}>{active?.title??"Choose one of your agents"}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><label style={styles.routerToggle}><input type="checkbox" checked={routerMode} onChange={e=>setRouterMode(e.target.checked)}/> Auto-route</label><button style={styles.secondary} onClick={()=>newConversation()}>New chat</button></div>
      </header>
      <div style={styles.messages}>
        {!messages.length&&<div style={styles.empty}><h2>{activeAgent?.role??"Your AI teammates"}</h2><p>{activeAgent?"This specialist runs for you on your connected device and only receives its authorized work context.":"Select an agent to start."}</p></div>}
        {messages.map(m=><div key={m.id} style={{...styles.bubbleWrap,justifyContent:m.sender==="USER"?"flex-end":"flex-start"}}>
          <div style={{...styles.bubble,...(m.sender==="USER"?styles.userBubble:{})}}><div style={styles.sender}>{m.sender}</div>{m.content}</div>
        </div>)}
        {sending&&<div style={styles.typing}>Agent is working…</div>}
      </div>
      {error&&<div style={styles.error}>{error}</div>}
      <div style={styles.composer}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message your AI teammate…" /><button onClick={send} disabled={sending||!input.trim()||!activeAgent}>Send</button></div>
    </section>
  </main>;
}

const styles:any={
shell:{display:"flex",height:"100vh",fontFamily:"Arial,sans-serif",background:"#f7f7f8",color:"#171717"},
sidebar:{width:330,borderRight:"1px solid #ddd",background:"#fff",padding:18,display:"flex",flexDirection:"column",boxSizing:"border-box"},
brand:{fontSize:20,fontWeight:700,marginBottom:10},muted:{fontSize:12,color:"#777",marginTop:4},
section:{fontSize:11,fontWeight:700,color:"#888",margin:"18px 4px 10px"},agentList:{display:"grid",gap:6,maxHeight:230,overflowY:"auto"},
agentCard:{width:"100%",textAlign:"left",border:"1px solid #eee",background:"#fafafa",padding:"10px 12px",borderRadius:9,cursor:"pointer",display:"flex",gap:9,alignItems:"flex-start"},
agentActive:{background:"#eee",borderColor:"#ccc"},agentDot:{fontSize:10,marginTop:3},
agentCardSpan:{display:"flex",flexDirection:"column"},agentCardSmall:{display:"block",fontSize:10,color:"#888",marginTop:3},
newButton:{border:"0",borderRadius:10,padding:"12px 14px",background:"#171717",color:"#fff",cursor:"pointer",fontWeight:700,marginTop:12},
list:{overflowY:"auto",flex:1},conversation:{width:"100%",textAlign:"left",border:"0",background:"transparent",padding:"12px",borderRadius:9,cursor:"pointer",display:"flex",justifyContent:"space-between",marginBottom:3},
active:{background:"#eee"},user:{borderTop:"1px solid #eee",paddingTop:14,fontSize:13},chat:{flex:1,display:"flex",flexDirection:"column",minWidth:0},
header:{height:72,borderBottom:"1px solid #ddd",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px"},
secondary:{border:"1px solid #ccc",background:"#fff",borderRadius:8,padding:"8px 12px",cursor:"pointer"},messages:{flex:1,overflowY:"auto",padding:24},
empty:{maxWidth:600,margin:"80px auto",textAlign:"center",color:"#555"},bubbleWrap:{display:"flex",marginBottom:14},
bubble:{maxWidth:"75%",background:"#fff",border:"1px solid #ddd",borderRadius:14,padding:"12px 15px",whiteSpace:"pre-wrap",lineHeight:1.5},
userBubble:{background:"#171717",color:"#fff",borderColor:"#171717"},sender:{fontSize:10,fontWeight:700,opacity:.65,marginBottom:4},
typing:{fontSize:13,color:"#777",padding:10},error:{color:"#b00020",padding:"0 24px 10px"},
composer:{display:"flex",gap:10,padding:18,background:"#fff",borderTop:"1px solid #ddd"},textarea:{flex:1,minHeight:50,resize:"vertical",border:"1px solid #ccc",borderRadius:10,padding:12,fontFamily:"inherit"},
button:{border:0,borderRadius:10,padding:"0 20px",background:"#171717",color:"#fff",cursor:"pointer"},createBox:{marginTop:8,padding:10,border:"1px solid #eee",borderRadius:10,background:"#fafafa",display:"grid",gap:7},input:{width:"100%",boxSizing:"border-box",border:"1px solid #ccc",borderRadius:8,padding:"8px",fontFamily:"inherit"},center:{padding:40}
};