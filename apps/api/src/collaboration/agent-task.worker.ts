import{Injectable,Logger,OnModuleInit}from"@nestjs/common";
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
   }catch(error){this.logger.error("Agent task worker error",error instanceof Error?error.stack:String(error));await new Promise(r=>setTimeout(r,1000));}
  }
 }
 private async handle(streamId:string,data:Record<string,string>){
  if(data.type!=="TASK_REQUEST"){await this.redis.ack("agent:tasks",this.group,streamId);return;}
  const taskId=data.taskId,companyId=data.companyId,receiverAgentId=data.receiverAgentId;
  if(!taskId||!companyId||!receiverAgentId){await this.redis.ack("agent:tasks",this.group,streamId);return;}
  const agents=await this.org.agents(companyId);
  const receiver=agents.find(a=>a.id===receiverAgentId);
  if(!receiver){await this.tasks.updateStatus(taskId,"FAILED",companyId);await this.redis.ack("agent:tasks",this.group,streamId);return;}
  await this.tasks.updateStatus(taskId,"IN_PROGRESS",companyId);
  try{
   const payload=JSON.parse(data.payload??"{}") as {title?:string;description?:string};
   const result=await this.agents.chat({agentId:receiver.id,employeeId:receiver.employeeId,companyId,message:`Delegated task: ${payload.title??"Task"}\n\n${payload.description??""}`});
   const response:Record<string,unknown>={taskId,senderAgentId:receiver.id,receiverAgentId:data.senderAgentId,companyId,type:"TASK_RESPONSE",payload:{response:result.response??""}};
   await this.messages.create(response as any);
   await this.redis.publish("agent:responses",Object.fromEntries(Object.entries(response).map(([k,v])=>[k,typeof v==="string"?v:JSON.stringify(v)])));
   await this.tasks.updateStatus(taskId,"COMPLETED",companyId);
   await this.redis.ack("agent:tasks",this.group,streamId);
  }catch(error){
   await this.tasks.updateStatus(taskId,"FAILED",companyId);
   await this.redis.ack("agent:tasks",this.group,streamId);
   this.logger.warn("Delegated agent task failed",error instanceof Error?error.message:String(error));
  }
 }
}
