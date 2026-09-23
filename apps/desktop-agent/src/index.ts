import { WebSocket } from "ws";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile,writeFile } from "node:fs/promises";
import { resolve,relative,sep } from "node:path";

const exec=promisify(execFile);
const DEVICE_WS_URL=process.env.DEVICE_WS_URL ?? "ws://localhost:3001/device";
const DEVICE_TOKEN=process.env.DEVICE_TOKEN;
const WORKSPACE=resolve(process.env.DEVICE_WORKSPACE ?? process.cwd());

if(!DEVICE_TOKEN) throw new Error("DEVICE_TOKEN is required");

const allowedActions=new Set((process.env.DEVICE_ALLOWED_ACTIONS??"device.files.read").split(",").map(x=>x.trim()).filter(Boolean));

function safePath(input:string){
  const target=resolve(WORKSPACE,input);
  const rel=relative(WORKSPACE,target);
  if(rel.startsWith(".."+sep)||rel==="..") throw new Error("Path is outside the device workspace");
  return target;
}

async function execute(action:string,args:any){
  if(!allowedActions.has(action)) throw new Error("Device action is not allowed by local policy");
  if(action==="device.files.read") return {content:await readFile(safePath(String(args.path)),"utf8")};
  if(action==="device.files.write"){
    await writeFile(safePath(String(args.path)),String(args.content),"utf8");
    return {ok:true};
  }
  if(action==="device.screenshot") throw new Error("Screenshot capability is reserved for the desktop integration layer");
  if(action==="device.browser") throw new Error("Browser capability is reserved for the browser automation layer");
  if(action==="device.terminal.execute"){
    const command=String(args.command??"").trim();
    if(!command) throw new Error("Command is required");
    const [file,...argv]=command.split(/\s+/);
    const result=await exec(file,argv,{cwd:WORKSPACE,timeout:30000,maxBuffer:1024*1024});
    return {stdout:result.stdout,stderr:result.stderr};
  }
  throw new Error("Unsupported action");
}

function connect(){
  const ws=new WebSocket(DEVICE_WS_URL+"?token="+encodeURIComponent(DEVICE_TOKEN));
  ws.on("open",()=>console.log("AI Teammates device connected"));
  ws.on("message",async raw=>{
    let message:any;
    try{message=JSON.parse(String(raw));}catch{return;}
    if(message.type!=="DEVICE_COMMAND") return;
    const command=message.command;
    try{
      const result=await execute(command.action,command.arguments??{});
      ws.send(JSON.stringify({type:"device.result",commandId:command.id,status:"COMPLETED",result}));
    }catch(error){
      ws.send(JSON.stringify({type:"device.result",commandId:command.id,status:"FAILED",result:{error:error instanceof Error?error.message:String(error)}}));
    }
  });
  ws.on("close",()=>setTimeout(connect,3000));
  ws.on("error",()=>undefined);
}
connect();
