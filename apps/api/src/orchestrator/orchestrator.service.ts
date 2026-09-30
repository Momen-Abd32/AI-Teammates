import{ForbiddenException,Injectable}from"@nestjs/common";import{OrganizationService}from"../organization/organization.service";import{TaskService}from"../tasks/task.service";import{CollaborationService}from"../collaboration/collaboration.service";import{ProjectService}from"../projects/project.service";import{AgentService}from"../agent/agent.service";
@Injectable()export class OrchestratorService{
 constructor(private org:OrganizationService,private tasks:TaskService,private collaboration:CollaborationService,private projects:ProjectService,private agent:AgentService){}
 async dispatch(input:{companyId:string;senderAgentId:string;receiverAgentId:string;title:string;description:string;projectId?:string;employeeId:string;conversationId?:string}){const agents=await this.org.agents(input.companyId),sender=agents.find(a=>a.id===input.senderAgentId),receiver=agents.find(a=>a.id===input.receiverAgentId);if(!sender||!receiver)throw new ForbiddenException("Both agents must belong to the company");if(sender.employeeId!==input.employeeId)throw new ForbiddenException("Sender agent does not belong to authenticated employee");if(sender.id===receiver.id)throw new ForbiddenException("An agent cannot delegate to itself");if(!Array.isArray(receiver.permissions)||!receiver.permissions.includes("agent.collaborate"))throw new ForbiddenException("Receiver agent is not allowed to collaborate");if(input.projectId)await this.projects.getForCompany(input.projectId,input.companyId);const task=await this.tasks.create({companyId:input.companyId,title:input.title.trim(),description:input.description.trim(),projectId:input.projectId,assignedAgentId:receiver.id,status:"WAITING_FOR_AGENT"});await this.collaboration.requestTask({taskId:task.id,senderAgentId:sender.id,receiverAgentId:receiver.id,companyId:input.companyId,projectId:input.projectId,type:"TASK_REQUEST",payload:{title:task.title,description:task.description,receiverRole:receiver.role,instructions:receiver.systemInstructions??""}},input.employeeId);return task;}
 async dispatchAndRun(input:{companyId:string;senderAgentId:string;receiverAgentId:string;title:string;description:string;projectId?:string;employeeId:string;conversationId?:string}){
  const task=await this.dispatch(input);
  const result=await this.agent.act({
   agentId:input.receiverAgentId,
   employeeId:input.employeeId,
   companyId:input.companyId,
   message:input.description,
   taskId:task.id,
   finalizeTask:false,
  });
  const response=typeof result?.response==="string"
   ? result.response
   : "Delegated agent completed the task without a user-facing response.";
  if(result?.status==="WAITING_FOR_HUMAN"){
   return {task,status:"WAITING_FOR_HUMAN",run:result};
  }
  const completed=await this.collaboration.respondTask({
   taskId:task.id,
   senderAgentId:input.receiverAgentId,
   receiverAgentId:input.senderAgentId,
   companyId:input.companyId,
   projectId:input.projectId,
   type:"TASK_RESPONSE",
   payload:{response,status:result?.status??"COMPLETED"},
  },input.employeeId);
  let senderConversationId=input.conversationId;
  if(senderConversationId){
    await this.agent.receiveDelegatedResult({
      agentId:input.senderAgentId,employeeId:input.employeeId,companyId:input.companyId,
      conversationId:senderConversationId,taskId:task.id,response,status:result?.status??"COMPLETED",
    });
  }
  return {task:completed.task,message:completed.message,response,conversationId:senderConversationId};
 }
}