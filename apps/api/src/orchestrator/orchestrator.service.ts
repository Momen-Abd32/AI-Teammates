import{ForbiddenException,Injectable}from"@nestjs/common";import{OrganizationService}from"../organization/organization.service";import{TaskService}from"../tasks/task.service";import{CollaborationService}from"../collaboration/collaboration.service";import{ProjectService}from"../projects/project.service";import{AgentService}from"../agent/agent.service";
@Injectable()export class OrchestratorService{
 constructor(private org:OrganizationService,private tasks:TaskService,private collaboration:CollaborationService,private projects:ProjectService,private agent:AgentService){}
 async route(input:{companyId:string;employeeId:string;senderAgentId:string;title:string;description:string;projectId?:string;conversationId?:string}){
  const agents=await this.org.agents(input.companyId);
  const sender=agents.find(a=>a.id===input.senderAgentId);
  if(!sender||sender.employeeId!==input.employeeId)throw new ForbiddenException("Sender agent does not belong to authenticated employee");
  const text=(input.title+" "+input.description).toLowerCase();
  const keywords=[
   {keys:["test","qa","bug","quality","regression"],roles:["testing","tester","qa"]},
   {keys:["document","docs","readme","documentation"],roles:["documentation","document","writer"]},
   {keys:["code","implement","develop","fix","refactor","build"],roles:["coding","developer","engineer"]},
   {keys:["monitor","log","health","alert","performance"],roles:["monitoring","monitor","ops"]},
   {keys:["email","message","communicate","reply","communication"],roles:["communication","communications"]},
  ];
  const candidates=agents.filter(a=>a.id!==sender.id&&Array.isArray(a.permissions)&&a.permissions.includes("agent.collaborate"));
  if(!candidates.length)throw new ForbiddenException("No collaborating agent is available for this employee");
  const scored=candidates.map(agent=>{
   const profile=((agent.role??"")+" "+(agent.systemInstructions??"")).toLowerCase();
   let score=0;
   for(const group of keywords)if(group.keys.some(k=>text.includes(k)))score+=group.roles.some(r=>profile.includes(r))?10:0;
   if(profile.includes("general")||profile.includes("assistant"))score+=1;
   return{agent,score};
  }).sort((a,b)=>b.score-a.score||a.agent.id.localeCompare(b.agent.id));
  const receiver=scored[0].agent;
  return this.dispatchAndRun({companyId:input.companyId,employeeId:input.employeeId,senderAgentId:sender.id,receiverAgentId:receiver.id,title:input.title,description:input.description,projectId:input.projectId,conversationId:input.conversationId});
 }
 async dispatch(input:{companyId:string;senderAgentId:string;receiverAgentId:string;title:string;description:string;projectId?:string;employeeId:string;conversationId?:string}){const agents=await this.org.agents(input.companyId),sender=agents.find(a=>a.id===input.senderAgentId),receiver=agents.find(a=>a.id===input.receiverAgentId);if(!sender||!receiver)throw new ForbiddenException("Both agents must belong to the company");if(sender.employeeId!==input.employeeId)throw new ForbiddenException("Sender agent does not belong to authenticated employee");if(sender.id===receiver.id)throw new ForbiddenException("An agent cannot delegate to itself");if(!Array.isArray(receiver.permissions)||!receiver.permissions.includes("agent.collaborate"))throw new ForbiddenException("Receiver agent is not allowed to collaborate");if(input.projectId)await this.projects.getForCompany(input.projectId,input.companyId);const task=await this.tasks.create({companyId:input.companyId,title:input.title.trim(),description:input.description.trim(),projectId:input.projectId,assignedAgentId:receiver.id,status:"WAITING_FOR_AGENT"});await this.collaboration.requestTask({taskId:task.id,senderAgentId:sender.id,receiverAgentId:receiver.id,companyId:input.companyId,projectId:input.projectId,type:"TASK_REQUEST",payload:{title:task.title,description:task.description,receiverRole:receiver.role,instructions:receiver.systemInstructions??"",conversationId:input.conversationId??null}},input.employeeId);return task;}
 async dispatchAndRun(input:{companyId:string;senderAgentId:string;receiverAgentId:string;title:string;description:string;projectId?:string;employeeId:string;conversationId?:string}){
  const task=await this.dispatch(input);
  const result:any=await this.agent.act({agentId:input.receiverAgentId,employeeId:input.employeeId,companyId:input.companyId,message:input.description,taskId:task.id,finalizeTask:false});
  const response=typeof result?.response==="string"?result.response:"Delegated agent completed the task without a user-facing response.";
  if(result?.status==="WAITING_FOR_HUMAN")return{task,status:"WAITING_FOR_HUMAN",run:result};
  const completed=await this.collaboration.respondTask({taskId:task.id,senderAgentId:input.receiverAgentId,receiverAgentId:input.senderAgentId,companyId:input.companyId,projectId:input.projectId,type:"TASK_RESPONSE",payload:{response,status:result?.status??"COMPLETED"}},input.employeeId);
  let senderConversationId=input.conversationId;if(senderConversationId)await this.agent.receiveDelegatedResult({agentId:input.senderAgentId,employeeId:input.employeeId,companyId:input.companyId,conversationId:senderConversationId,taskId:task.id,response,status:result?.status??"COMPLETED"});
  return{task:completed.task,message:completed.message,response,conversationId:senderConversationId};
 }
}
