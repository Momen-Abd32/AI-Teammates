import{Injectable,BadGatewayException}from"@nestjs/common";import{PermissionService}from"../security/permission.service";import{AuditService}from"../audit/audit.service";
@Injectable()export class AgentService{
 constructor(private permissions:PermissionService,private audit:AuditService){this.permissions.grant("agent-demo","agent.chat")}
 getDemoAgent(){return{id:"agent-demo",employeeId:"employee-demo",companyId:"company-demo",role:"full_stack_developer",permissions:["agent.chat","project.read","task.read","memory.write"]}}
 async chat(input:{agentId:string;employeeId:string;companyId:string;role?:string;message:string}){
  this.permissions.assert({companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId},"agent.chat");
  this.audit.record({companyId:input.companyId,actorId:input.employeeId,agentId:input.agentId,action:"agent.chat",resource:input.agentId});
  const baseUrl=process.env.AGENT_SERVICE_URL??"http://localhost:8000";
  const response=await fetch(baseUrl+"/v1/agents/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)});
  if(!response.ok)throw new BadGatewayException("Agent service request failed");
  return response.json();
 }
}