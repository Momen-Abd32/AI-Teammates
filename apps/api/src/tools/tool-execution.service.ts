import {ForbiddenException,Injectable}from "@nestjs/common";
import {ApprovalService}from "../approvals/approval.service";
import {AuditService}from "../audit/audit.service";
import {ToolExecutionRepository}from "./tool-execution.repository";
import {ToolPolicyService}from "./tool-policy.service";
import {ToolRequest}from "./tool.types";
import {SandboxService}from "../sandbox/sandbox.service";
import {ActivityEventService}from "../activity/activity.event.service";

@Injectable()
export class ToolExecutionService{
 constructor(private policy:ToolPolicyService,private executions:ToolExecutionRepository,private approvals:ApprovalService,private audit:AuditService,private sandbox:SandboxService,private activity:ActivityEventService){}

 async request(input:ToolRequest){
  await this.activity.publish({type:"tool.started",companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId,message:`Tool requested: ${input.name}`,...(input.taskId?{conversationId:input.taskId}: {})});
  const decision=await this.policy.decide(input);
  const execution=await this.executions.create({
   companyId:input.companyId,agentId:input.agentId,action:input.name,resource:input.resource,
   arguments:input.arguments,status:decision.requiresApproval?"WAITING_FOR_HUMAN":"RUNNABLE",
  });
  if(decision.requiresApproval){
   const approval=await this.approvals.request({
    companyId:input.companyId,agentId:input.agentId,taskId:input.taskId,
    action:input.name,reason:input.reason??decision.reason,
   });
   await this.audit.record({companyId:input.companyId,agentId:input.agentId,action:"TOOL_APPROVAL_REQUESTED",resource:input.name,metadata:{executionId:execution.id,approvalId:approval.id}});
   return {status:"WAITING_FOR_HUMAN",execution,approval};
  }
  return this.executeAllowed(input,execution.id);
 }

 async approveAndExecute(executionId:string,approvalId:string,decidedBy:string){
  const execution=await this.executions.get(executionId);
  if(!execution) throw new ForbiddenException("Tool execution not found");
  const approval=await this.approvals.decide(approvalId,decidedBy,"APPROVED",execution.companyId);
  if(approval.status!=="APPROVED"||approval.companyId!==execution.companyId) throw new ForbiddenException("Approval mismatch");
  const result=await this.executeTool(execution.action,execution.agentId,execution.arguments);
  const completed=await this.executions.complete(executionId,"COMPLETED",result);
  await this.activity.publish({type:"tool.completed",companyId:execution.companyId,employeeId:decidedBy,agentId:execution.agentId,message:`Tool completed: ${execution.action}`});
  await this.audit.record({companyId:execution.companyId,actorId:decidedBy,agentId:execution.agentId,action:"TOOL_EXECUTED",resource:execution.action,metadata:{executionId,approvalId}});
  return {execution:completed,result};
 }

 private async executeTool(name:string,agentId:string,args:Record<string,unknown>){
  if(name==="terminal.execute"){
   const language=String(args.language??"python");
   const code=String(args.code??"");
   return this.sandbox.execute(agentId,language,code);
  }

  const token=process.env.GITHUB_TOKEN;
  const api=process.env.GITHUB_API_URL??"https://api.github.com";
  if(name.startsWith("repository.")||name==="issue.create"){
   if(!token) throw new ForbiddenException("GitHub integration is not configured");
   const repository=String(args.repository??"");
   if(!/^[^/]+\/[^/]+$/.test(repository)) throw new ForbiddenException("A valid GitHub repository is required");
   const allowed=(process.env.GITHUB_ALLOWED_REPOS??"").split(",").map(x=>x.trim()).filter(Boolean);
   if(allowed.length&&!allowed.includes(repository)) throw new ForbiddenException("Repository is not allowed");

   const headers:Record<string,string>={"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28"};
   if(name==="repository.read"){
    const path=String(args.path??"");
    const response=await fetch(`${api}/repos/${repository}/contents/${path}`,{headers});
    if(!response.ok) throw new ForbiddenException("GitHub repository read failed");
    const data=await response.json() as any;
    return {name:data.name,path:data.path,sha:data.sha,content:data.encoding==="base64"?Buffer.from(data.content.replace(/\\n/g,""),"base64").toString("utf8"):data.content,type:data.type};
   }
   if(name==="issue.create"){
    const response=await fetch(`${api}/repos/${repository}/issues`,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify({title:String(args.title??""),body:String(args.body??""),labels:Array.isArray(args.labels)?args.labels:[]})});
    if(!response.ok) throw new ForbiddenException("GitHub issue creation failed");
    const data=await response.json() as any;
    return {id:data.id,number:data.number,url:data.html_url,title:data.title};
   }
   if(name==="repository.write"){
    const path=String(args.path??"");
    const message=String(args.message??"");
    const content=Buffer.from(String(args.content??"")).toString("base64");
    const body:any={message,content};
    if(args.sha) body.sha=String(args.sha);
    const response=await fetch(`${api}/repos/${repository}/contents/${path}`,{method:"PUT",headers:{"content-type":"application/json",...headers},body:JSON.stringify(body)});
    if(!response.ok) throw new ForbiddenException("GitHub repository write failed");
    const data=await response.json() as any;
    return {path:data.content?.path,sha:data.content?.sha,url:data.content?.html_url};
   }
   if(name==="repository.delete"){
    const path=String(args.path??"");
    const sha=String(args.sha??"");
    const message=String(args.message??"");
    const response=await fetch(`${api}/repos/${repository}/contents/${path}`,{method:"DELETE",headers:{"content-type":"application/json",...headers},body:JSON.stringify({message,sha})});
    if(!response.ok) throw new ForbiddenException("GitHub repository delete failed");
    return {deleted:true,path};
   }
  }
  throw new ForbiddenException(`Tool ${name} is not implemented`);
 }

 private async executeAllowed(input:ToolRequest,executionId:string){
  const result=await this.executeTool(input.name,input.agentId,input.arguments);
  const completed=await this.executions.complete(executionId,"COMPLETED",result);
  await this.audit.record({companyId:input.companyId,agentId:input.agentId,action:"TOOL_EXECUTED",resource:input.name,metadata:{executionId}});
  return {execution:completed,result};
 }
}
