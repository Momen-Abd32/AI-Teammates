import {ForbiddenException,Injectable} from "@nestjs/common";
import {MessageBusService,AgentTaskMessage} from "./message-bus.service";
import {MessageRepository} from "./message.repository";
import {ActivityEventService} from "../activity/activity.event.service";

@Injectable()
export class CollaborationService {
  constructor(private bus:MessageBusService,private messages:MessageRepository,private activity:ActivityEventService){}
  async requestTask(input:AgentTaskMessage){
    if(input.senderAgentId===input.receiverAgentId) throw new ForbiddenException("An agent cannot delegate to itself");
    if(!input.companyId || !input.taskId) throw new ForbiddenException("Company and task context are required");
    if(!input.receiverAgentId) throw new ForbiddenException("Receiver agent is required");
    await this.messages.create({...input,type:"TASK_REQUEST"});
    await this.activity.publish({type:"agent.delegated",companyId:input.companyId,employeeId:input.senderAgentId,agentId:input.senderAgentId,message:`Task delegated to agent ${input.receiverAgentId}`});
    return this.bus.publish({...input,type:"TASK_REQUEST"});
  }
}