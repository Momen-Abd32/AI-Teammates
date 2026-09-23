import{Injectable,ForbiddenException}from"@nestjs/common";import{execFile}from"child_process";import{promisify}from"util";const run=promisify(execFile);
const ALLOWED=new Set(["python","node"]);
@Injectable()export class SandboxService{
 async execute(agentId:string,language:string,code:string){
  if(!ALLOWED.has(language))throw new ForbiddenException("Language not allowed");
  if(code.length>20000)throw new ForbiddenException("Execution payload too large");
  const file=language==="python"?"/tmp/agent.py":"/tmp/agent.js";
  const command=language==="python"?"python3":"node";
  const{stdout,stderr}=await run("sh",["-lc",`printf '%s' "$CODE" > ${file} && timeout 10s ${command} ${file}`],{env:{...process.env,CODE:code},timeout:12000,maxBuffer:1024*1024});
  return{agentId,stdout,stderr};
 }
}