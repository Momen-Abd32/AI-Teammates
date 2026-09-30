import {ForbiddenException,Injectable}from "@nestjs/common";
import {MessageBusService,AgentTaskMessage}from "./message-bus.service";
import {MessageRepository}from "./message.repository";
import {ActivityEventService}from "../activity/activity.event.service";
import {OrganizationService}from "../organization/organization.service";
import {TaskService}from "../tasks/task.service";
import {AgentService}from "../agent/agent.service";

@Injectable()
export class CollaborationService {
 constructor(private bus:MessageBusService,private messages:MessageRepository,private activity:ActivityEventService,private org:OrganizationService,private tasks:TaskService,private agents:AgentService){}
 async requestTask(input:AgentTaskMessage,requesterEmployeeId?:string){
  if(input.senderAgentId===input.receiverAgentId)throw new ForbiddenException("An agent cannot delegate to itself");
  if(!input.companyId||!input.taskId)throw new ForbiddenException("Company and task context are required");
  if(!input.receiverAgentId)throw new ForbiddenException("Receiver agent is required");
  const task=await this.tasks.getForCompany(input.taskId,input.companyId);
  const agents=await this.org.agents(input.companyId);
  const sender=agents.find(agent=>agent.id===input.senderAgentId),receiver=agents.find(agent=>agent.id===input.receiverAgentId);
  if(!sender||!receiver||sender.companyId!==input.companyId||receiver.companyId!==input.companyId)throw new ForbiddenException("Both agents must belong to the company");
  if(!requesterEmployeeId)throw new ForbiddenException("Authenticated employee context is required");
  if(sender.employeeId!==requesterEmployeeId)throw new ForbiddenException("Sender agent does not belong to the authenticated employee");
  if(task.assignedAgentId&&task.assignedAgentId!==receiver.id)throw new ForbiddenException("Task is assigned to a different agent");
  if(!(Array.isArray(receiver.permissions)?receiver.permissions:[]).includes("agent.collaborate"))throw new ForbiddenException("Receiver agent is not allowed to collaborate");
  if(input.projectId&&task.projectId&&input.projectId!==task.projectId)throw new ForbiddenException("Project context does not match task");
  await this.messages.create({...input,type:"TASK_REQUEST"});
  await this.tasks.updateStatus(task.id,"IN_PROGRESS",input.companyId);
  await this.activity.publish({type:"agent.delegated",companyId:input.companyId,employeeId:sender.employeeId,agentId:sender.id,message:`Task delegated to agent ${receiver.id}`});
  return this.bus.publish({...input,type:"TASK_REQUEST"});
 }
 async respondTask(input:AgentTaskMessage,requesterEmployeeId?:string){
  if(input.type!=="TASK_RESPONSE")throw new ForbiddenException("Task response message is required");
  if(!input.companyId||!input.taskId||!input.receiverAgentId)throw new ForbiddenException("Company, task and receiver context are required");
  const task=await this.tasks.getForCompany(input.taskId,input.companyId);
  const agents=await this.org.agents(input.companyId);
  const sender=agents.find(agent=>agent.id===input.senderAgentId),receiver=agents.find(agent=>agent.id===input.receiverAgentId);
  if(!sender||!receiver)throw new ForbiddenException("Both agents must belong to the company");
  if(!requesterEmployeeId)throw new ForbiddenException("Authenticated employee context is required");
  if(sender.employeeId!==requesterEmployeeId)throw new ForbiddenException("Responding agent does not belong to authenticated employee");
  if(sender.id===receiver.id)throw new ForbiddenException("Sender and receiver agents must be different");
  if(task.assignedAgentId!==sender.id)throw new ForbiddenException("Only the assigned agent can complete this task");
  if(task.status!=="IN_PROGRESS"&&task.status!=="WAITING_FOR_AGENT")throw new ForbiddenException("Task is not awaiting agent work");
  if(input.projectId&&task.projectId&&input.projectId!==task.projectId)throw new ForbiddenException("Project context does not match task");
  const message=await this.messages.create({...input,type:"TASK_RESPONSE"});
  await this.tasks.updateStatus(task.id,"COMPLETED",input.companyId);
  await this.activity.publish({type:"agent.task_completed",companyId:input.companyId,employeeId:sender.employeeId,agentId:sender.id,message:"Task "+task.id+" completed by agent "+sender.id});
  await this.bus.publishResponse({...input,type:"TASK_RESPONSE"});
  return{task:await this.tasks.getForCompany(task.id,input.companyId),message};
 }
 async completeDelegatedRun(input:{taskId:string;companyId:string;employeeId:string;response:string;status:string}){
  const task=await this.tasks.getForCompany(input.taskId,input.companyId);
  if(task.status==="COMPLETED")return{task};
  const messages=await this.messages.listTask(task.id,input.companyId);
  const request=messages.find(message=>message.type==="TASK_REQUEST");
  if(!request)throw new ForbiddenException("Delegated task request message is missing");
  if(messages.some(message=>message.type==="TASK_RESPONSE"))return{task:await this.tasks.getForCompany(task.id,input.companyId)};
  const conversationId=typeof request.payload?.conversationId==="string"?request.payload.conversationId:null;
  const result=await this.respondTask({
    taskId:task.id,
    companyId:input.companyId,
    senderAgentId:request.receiverAgentId,
    receiverAgentId:request.senderAgentId,
    projectId:task.projectId??request.projectId,
    type:"TASK_RESPONSE",
    payload:{response:input.response,status:input.status},
  },input.employeeId);
  if(conversationId)await this.agents.receiveDelegatedResult({
    agentId:request.senderAgentId,
    employeeId:input.employeeId,
    companyId:input.companyId,
    conversationId,
    taskId:task.id,
    response:input.response,
    status:input.status,
  });
  return{...result,conversationId};
 }
}