import {ForbiddenException,Injectable} from "@nestjs/common";
import {MessageBusService,AgentTaskMessage} from "./message-bus.service";
@Injectable()
export class CollaborationService{
 constructor(private readonly bus:MessageBusService){}
 requestTask(input:AgentTaskMessage){
  if(input.senderAgentId===input.receiverAgentId)throw new ForbiddenException("An agent cannot delegate to itself");
  if(!input.companyId||!input.taskId)throw new ForbiddenException("Company and task context are required");
  return this.bus.publish({...input,type:"TASK_REQUEST"});
 }
}