import{ForbiddenException,Injectable,Logger,OnModuleInit}from"@nestjs/common";
import{RedisService}from"../infrastructure/redis.service";
import{OrganizationService}from"../organization/organization.service";
import{TaskService}from"../tasks/task.service";
import{MessageRepository}from"./message.repository";
import{AgentService}from"../agent/agent.service";

@Injectable()
export class AgentTaskWorker implements OnModuleInit{
 private readonly logger=new Logger(AgentTaskWorker.name);
 private readonly group="agent-runtime";
 private readonly consumer=`api-${process.pid}`;
 constructor(private redis:RedisService,private org:OrganizationService,private tasks:TaskService,private messages:MessageRepository,private agents:AgentService){}
 onModuleInit(){void this.loop();}
 private async loop(){
  for(;;){
   try{
    const rows=await this.redis.read("agent:tasks",this.group,this.consumer,5) as any[]|null;
    if(!rows?.length)continue;
    const entries=rows[0]?.[1]??[];
    for(const [id,fields] of entries){
     const data:Record<string,string>={};
     for(let i=0;i<fields.length;i+=2)data[fields[i]]=fields[i+1];
     await this.handle(id,data);
    }
   }catch(error){
    this.logger.error("Agent task worker error",error instanceof Error?error.stack:String(error));
    await new Promise(r=>setTimeout(r,1000));
   }
  }
 }
 private async publishResponse(response:{taskId:string;senderAgentId:string;receiverAgentId:string;companyId:string;projectId?:string;type:"TASK_RESPONSE";payload:Record<string,unknown>}){
  await this.messages.create(response);
  await this.redis.publish("agent:responses",{
   taskId:response.taskId,
   senderAgentId:response.senderAgentId,
   receiverAgentId:response.receiverAgentId,
   companyId:response.companyId,
   projectId:response.projectId??"",
   type:response.type,
   payload:JSON.stringify(response.payload),
  });
 }
 private async handle(streamId:string,data:Record<string,string>){
  if(data.type!=="TASK_REQUEST"){await this.redis.ack("agent:tasks",this.group,streamId);return;}
  const taskId=data.taskId,companyId=data.companyId,receiverAgentId=data.receiverAgentId,senderAgentId=data.senderAgentId;
  if(!taskId||!companyId||!receiverAgentId||!senderAgentId){await this.redis.ack("agent:tasks",this.group,streamId);return;}
  try{
   const task=await this.tasks.getForCompany(taskId,companyId);
   const agents=await this.org.agents(companyId);
   const receiver=agents.find(a=>a.id===receiverAgentId);
   const sender=agents.find(a=>a.id===senderAgentId);
   if(!receiver||!sender)throw new ForbiddenException("Delegation agents must belong to the task company");
   if(receiver.id===sender.id)throw new ForbiddenException("An agent cannot execute its own delegation");
   if(task.assignedAgentId!==receiver.id)throw new ForbiddenException("Task is not assigned to the receiving agent");
   if(task.projectId&&data.projectId&&task.projectId!==data.projectId)throw new ForbiddenException("Task project context mismatch");
   await this.tasks.updateStatus(taskId,"IN_PROGRESS",companyId);
   const payload=JSON.parse(data.payload??"{}") as {title?:string;description?:string};
   const result=await this.agents.chat({agentId:receiver.id,employeeId:receiver.employeeId,companyId,message:`Delegated task: ${payload.title??task.title}\n\n${payload.description??task.description}`});
   const response={taskId,senderAgentId:receiver.id,receiverAgentId:sender.id,companyId,projectId:task.projectId,type:"TASK_RESPONSE" as const,payload:{status:"COMPLETED",response:result.response??"",nextAction:"Return the result to the requesting agent."}};
   await this.publishResponse(response);
   await this.tasks.updateStatus(taskId,"COMPLETED",companyId);
  }catch(error){
   const reason=error instanceof Error?error.message:"Delegated agent task failed";
   await this.tasks.updateStatus(taskId,"FAILED",companyId).catch(()=>undefined);
   await this.publishResponse({taskId,senderAgentId:receiverAgentId,receiverAgentId:senderAgentId,companyId,projectId:data.projectId,type:"TASK_RESPONSE",payload:{status:"FAILED",response:"",blockers:[reason],nextAction:"Review the task failure and retry after resolving the blocker."}}).catch(publishError=>this.logger.error("Failed to publish task failure",publishError instanceof Error?publishError.stack:String(publishError)));
   this.logger.warn("Delegated agent task failed",reason);
  }finally{
   await this.redis.ack("agent:tasks",this.group,streamId);
  }
 }
}
