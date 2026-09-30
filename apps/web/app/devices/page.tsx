"use client";

import {useEffect,useMemo,useState} from "react";
import {apiFetch} from "../../lib/auth";

type Agent={id:string;role:string;permissions?:string[]};
type Binding={deviceId:string;agentId:string;permissions:string[];active:boolean};
type Device={id:string;name:string;platform:string;status:string;capabilities:string[];lastSeenAt?:string|null;bindings:Binding[]};

const DEVICE_PERMISSIONS=[
  ["device.files.read","Read files"],
  ["device.files.write","Write files"],
  ["device.terminal.execute","Terminal"],
  ["device.browser","Browser"],
  ["device.screenshot","Screenshots"],
] as const;

export default function DevicesPage(){
  const [devices,setDevices]=useState<Device[]>([]);
  const [agents,setAgents]=useState<Agent[]>([]);
  const [selected,setSelected]=useState<string>("");
  const [permissions,setPermissions]=useState<string[]>(["device.files.read","device.screenshot"]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [name,setName]=useState("");
  const [platform,setPlatform]=useState("desktop");
  const [token,setToken]=useState("");

  async function load(){
    setError("");
    const auth=await apiFetch("/auth/validate",{method:"POST"});
    if(!auth.ok){window.location.href="/login";return;}
    const [d,a]=await Promise.all([apiFetch("/devices"),apiFetch("/organization/my-agents")]);
    if(!d.ok||!a.ok){setError("Could not load devices and agents.");setLoading(false);return;}
    const deviceData=await d.json();
    const agentData=await a.json();
    setDevices(deviceData);
    setAgents(agentData);
    if(!selected && deviceData[0]) setSelected(deviceData[0].id);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  const activeDevice=useMemo(()=>devices.find(d=>d.id===selected),[devices,selected]);
    function togglePermission(permission:string){
    setPermissions(p=>p.includes(permission)?p.filter(x=>x!==permission):[...p,permission]);
  }

  async function bind(agentId:string){
    if(!activeDevice)return;
    setBusy(agentId);setError("");
    const r=await apiFetch("/devices/"+activeDevice.id+"/bind-agent",{
      method:"POST",body:JSON.stringify({agentId,permissions})
    });
    if(!r.ok){setError((await r.text())||"Could not bind agent.");setBusy("");return;}
    await load();setBusy("");
  }

  async function updateBinding(agentId:string){
    if(!activeDevice)return;
    setBusy(agentId);setError("");
    const r=await apiFetch("/devices/"+activeDevice.id+"/bind-agent",{
      method:"POST",body:JSON.stringify({agentId,permissions})
    });
    if(!r.ok){setError((await r.text())||"Could not update binding.");setBusy("");return;}
    await load();setBusy("");
  }

  async function unbind(agentId:string){
    if(!activeDevice)return;
    setBusy(agentId);setError("");
    const r=await apiFetch("/devices/"+activeDevice.id+"/unbind-agent",{
      method:"POST",body:JSON.stringify({agentId})
    });
    if(!r.ok){setError((await r.text())||"Could not unbind agent.");setBusy("");return;}
    await load();setBusy("");
  }

  async function revoke(){
    if(!activeDevice)return;
    if(!window.confirm("Revoke this device? Its agents will no longer be able to use it."))return;
    setBusy("revoke");setError("");
    const r=await apiFetch("/devices/"+activeDevice.id+"/revoke",{method:"PATCH"});
    if(!r.ok){setError((await r.text())||"Could not revoke device.");setBusy("");return;}
    await load();setBusy("");
  }

  async function register(){
    if(!name.trim())return;
    setBusy("register");setError("");setToken("");
    const r=await apiFetch("/devices/register",{
      method:"POST",body:JSON.stringify({name:name.trim(),platform})
    });
    if(!r.ok){setError((await r.text())||"Could not register device.");setBusy("");return;}
    const result=await r.json();
    setToken(result.deviceToken??"");
    setName("");
    await load();
    if(result.id)setSelected(result.id);
    setBusy("");
  }

  if(loading)return <main style={styles.center}>Loading devices…</main>;

  return <main style={styles.shell}>
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Devices & Agent Bindings</h1>
        <p style={styles.sub}>Connect one employee device and control which AI teammates can use it.</p>
      </div>
      <a href="/my-agent" style={styles.link}>← My agents</a>
    </header>

    {error&&<div style={styles.error}>{error}</div>}
    {token&&<div style={styles.token}><b>Device token — copy it now</b><code>{token}</code><span>This token is only returned during registration. Store it securely and use it in the desktop agent.</span></div>}

    <section style={styles.grid}>
      <aside style={styles.panel}>
        <h2 style={styles.h2}>Your devices</h2>
        {!devices.length&&<p style={styles.muted}>No device registered yet.</p>}
        {devices.map(d=><button key={d.id} onClick={()=>setSelected(d.id)} style={{...styles.device,...(d.id===selected?styles.selected:{})}}>
          <span style={styles.deviceIcon}>▣</span>
          <span style={{flex:1,textAlign:"left"}}><b>{d.name}</b><small>{d.platform} · {d.status}</small></span>
          <span style={d.status==="ONLINE"?styles.online:styles.offline}>●</span>
        </button>)}

        <div style={styles.register}>
          <h3 style={styles.h3}>Register a device</h3>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="My Windows PC" style={styles.input}/>
          <select value={platform} onChange={e=>setPlatform(e.target.value)} style={styles.input}>
            <option value="desktop">Desktop</option><option value="windows">Windows</option><option value="macos">macOS</option><option value="linux">Linux</option>
          </select>
          <button onClick={register} disabled={busy==="register"||!name.trim()} style={styles.primary}>{busy==="register"?"Registering…":"Register device"}</button>
        </div>
      </aside>

      <section style={styles.panel}>
        <div style={styles.row}>
          <div><h2 style={styles.h2}>Agent bindings</h2><p style={styles.muted}>{activeDevice?activeDevice.name:"Select a device"}</p></div>
          {activeDevice&&activeDevice.status!=="REVOKED"&&<button onClick={revoke} disabled={busy==="revoke"} style={styles.danger}>{busy==="revoke"?"Revoking…":"Revoke device"}</button>}
        </div>

        {!activeDevice?<div style={styles.empty}>Select a device to manage its agents.</div>:
          <div style={styles.agents}>
            {agents.map(agent=>{
              const binding=activeDevice.bindings.find(b=>b.agentId===agent.id&&b.active);
              return <div key={agent.id} style={styles.agent}>
                <div style={styles.agentTop}>
                  <div><b>{agent.role}</b><div style={styles.muted}>{agent.id}</div></div>
                  {binding?<span style={styles.badge}>BOUND</span>:<span style={styles.badgeOff}>NOT BOUND</span>}
                </div>
                {binding&&<div style={styles.currentPerms}>Current: {binding.permissions.join(" · ")}</div>}
                <div style={styles.actions}>
                  <div style={{display:"flex",gap:8}}><button onClick={()=>binding?unbind(agent.id):bind(agent.id)} disabled={busy===agent.id||activeDevice.status==="REVOKED"} style={binding?styles.secondary:styles.primary}>
                    {busy===agent.id?"Working…":binding?"Unbind":"Bind to device"}
                  </button>{binding&&<button onClick={()=>updateBinding(agent.id)} disabled={busy===agent.id||activeDevice.status==="REVOKED"} style={styles.secondary}>Apply permissions</button>}
                  </div>
                </div>
              </div>
            })}
            {!agents.length&&<div style={styles.empty}>No AI teammates assigned to this employee.</div>}
          </div>
        }

        <div style={styles.permissions}>
          <h3 style={styles.h3}>Permissions for next binding</h3>
          <p style={styles.muted}>These permissions apply when you bind or re-bind an agent.</p>
          {DEVICE_PERMISSIONS.map(([id,label])=><label key={id} style={styles.check}>
            <input type="checkbox" checked={permissions.includes(id)} onChange={()=>togglePermission(id)}/>
            <span><b>{label}</b><small>{id}</small></span>
          </label>)}
        </div>
      </section>
    </section>
  </main>;
}

const styles:any={
  shell:{minHeight:"100vh",background:"#f7f7f8",fontFamily:"Arial,sans-serif",color:"#171717",padding:"32px 5vw",boxSizing:"border-box"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24},
  title:{margin:0,fontSize:30},sub:{color:"#666",margin:"7px 0 0"},link:{color:"#171717",textDecoration:"none",fontWeight:700},
  grid:{display:"grid",gridTemplateColumns:"minmax(280px,360px) 1fr",gap:20,maxWidth:1100},
  panel:{background:"#fff",border:"1px solid #ddd",borderRadius:14,padding:20},h2:{margin:"0 0 5px",fontSize:20},h3:{margin:"0 0 10px",fontSize:14},muted:{fontSize:12,color:"#777",margin:"4px 0"},
  device:{width:"100%",display:"flex",gap:10,alignItems:"center",border:"1px solid #eee",background:"#fafafa",borderRadius:10,padding:12,marginBottom:8,cursor:"pointer"},
  selected:{borderColor:"#171717",background:"#f0f0f0"},deviceIcon:{fontSize:18},online:{fontSize:10},offline:{fontSize:10,color:"#999"},
  register:{borderTop:"1px solid #eee",marginTop:18,paddingTop:18},input:{width:"100%",boxSizing:"border-box",padding:10,border:"1px solid #ccc",borderRadius:8,marginBottom:8,background:"#fff"},
  primary:{border:0,borderRadius:8,padding:"10px 14px",background:"#171717",color:"#fff",cursor:"pointer",fontWeight:700},secondary:{border:"1px solid #ccc",borderRadius:8,padding:"9px 14px",background:"#fff",cursor:"pointer"},danger:{border:"1px solid #b00020",color:"#b00020",background:"#fff",borderRadius:8,padding:"9px 14px",cursor:"pointer"},
  row:{display:"flex",justifyContent:"space-between",alignItems:"center"},agents:{display:"grid",gap:10,marginTop:18},agent:{border:"1px solid #e5e5e5",borderRadius:10,padding:14},agentTop:{display:"flex",justifyContent:"space-between",alignItems:"center"},badge:{fontSize:10,fontWeight:700,padding:"4px 7px",borderRadius:999,background:"#e8f5e9"},badgeOff:{fontSize:10,fontWeight:700,padding:"4px 7px",borderRadius:999,background:"#eee",color:"#777"},currentPerms:{fontSize:11,color:"#666",marginTop:9},actions:{marginTop:10},permissions:{borderTop:"1px solid #eee",marginTop:22,paddingTop:18},check:{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 0",borderBottom:"1px solid #f0f0f0"},empty:{padding:30,textAlign:"center",color:"#777"},error:{background:"#fff0f0",color:"#a00020",padding:12,borderRadius:9,marginBottom:15},token:{background:"#f1f7ff",border:"1px solid #b7d4ff",padding:14,borderRadius:10,marginBottom:15,display:"grid",gap:7}
};
