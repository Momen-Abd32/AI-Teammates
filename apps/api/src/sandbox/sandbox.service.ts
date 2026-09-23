import{ForbiddenException,Injectable,ServiceUnavailableException}from "@nestjs/common";

@Injectable()
export class SandboxService{
 private readonly url=process.env.SANDBOX_WORKER_URL??"http://sandbox-worker:8010";

 async execute(agentId:string,language:string,code:string){
  if(!["python","node"].includes(language)) throw new ForbiddenException("Language not allowed");
  if(code.length>20000) throw new ForbiddenException("Execution payload too large");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(this.url+"/execute",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agent_id:agentId,language,code}),signal:controller.signal});
   if(!response.ok) throw new ServiceUnavailableException("Sandbox worker rejected execution");
   return await response.json();
  }catch(error:any){
   if(error?.name==="AbortError") throw new ServiceUnavailableException("Sandbox execution timed out");
   if(error instanceof ServiceUnavailableException) throw error;
   throw new ServiceUnavailableException("Sandbox worker unavailable");
  }finally{clearTimeout(timer);}
 }
}
