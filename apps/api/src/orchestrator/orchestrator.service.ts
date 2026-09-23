import{ForbiddenException,Injectable}from"@nestjs/common";
import{OrganizationService}from"../organization/organization.service";
import{TaskService}from"../tasks/task.service";
import{CollaborationService}from"../collaboration/collaboration.service";

@Injectable()
export class OrchestratorService{
 constructor(private org:OrganizationService,private tasks:TaskService,private collaboration:CollaborationService){}
 async dispatch(input:{companyId:string;senderAgentId:string;receiverAgentId:string;title:string;description:string;projectId?:string;employeeId:string}){
  const agents=await this.org.agents(input.companyId);
  const sender=agents.find(a=>a.id===input.senderAgentId);
  const receiver=agents.find(a=>a.id===input.receiverAgentId);
  if(!sender||!receiver)throw new ForbiddenException("Both agents must belong to the company");
  if(sender.employeeId!==input.employeeId)throw new ForbiddenException("Sender agent does not belong to the authenticated employee");
  if(sender.id===receiver.id)throw new ForbiddenException("An agent cannot delegate to itself");
  const task=await this.tasks.create({
   companyId:input.companyId,
   title:input.title.trim(),
   description:input.description.trim(),
   projectId:input.projectId,
   assignedAgentId:receiver.id,
   status:"WAITING_FOR_AGENT",
  });
  await this.collaboration.requestTask({
   taskId:task.id,
   senderAgentId:sender.id,
   receiverAgentId:receiver.id,
   companyId:input.companyId,
   projectId:input.projectId,
   type:"TASK_REQUEST",
   payload:{title:task.title,description:task.description},
  });
  return task;
 }
}
