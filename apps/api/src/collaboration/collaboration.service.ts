import {ForbiddenException,Injectable} from "@nestjs/common";
import {MessageBusService,AgentTaskMessage} from "./message-bus.service";
import {MessageRepository} from "./message.repository";
import {ActivityEventService} from "../activity/activity.event.service";
import {OrganizationService} from "../organization/organization.service";

@Injectable()
export class CollaborationService {
  constructor(private bus:MessageBusService,private messages:MessageRepository,private activity:ActivityEventService,private org:OrganizationService){}
  async requestTask(input:AgentTaskMessage){
    if(input.senderAgentId===input.receiverAgentId) throw new ForbiddenException("An agent cannot delegate to itself");
    if(!input.companyId || !input.taskId) throw new ForbiddenException("Company and task context are required");
    if(!input.receiverAgentId) throw new ForbiddenException("Receiver agent is required");
    const agents=await this.org.agents(input.companyId);
    const sender=agents.find(agent=>agent.id===input.senderAgentId);
    const receiver=agents.find(agent=>agent.id===input.receiverAgentId);
    if(!sender || !receiver) throw new ForbiddenException("Both agents must belong to the company");
    await this.messages.create({...input,type:"TASK_REQUEST"});
    await this.activity.publish({
      type:"agent.delegated",
      companyId:input.companyId,
      employeeId:sender.employeeId,
      agentId:sender.id,
      message:`Task delegated to agent ${receiver.id}`,
    });
    return this.bus.publish({...input,type:"TASK_REQUEST"});
  }
}