import { Injectable } from "@nestjs/common";
import { RedisService } from "../infrastructure/redis.service";

export type AgentTaskMessage={taskId:string;senderAgentId:string;receiverAgentId:string;companyId:string;projectId?:string;type:"TASK_REQUEST"|"TASK_RESPONSE";payload:Record<string,unknown>};

@Injectable()
export class MessageBusService {
  constructor(private readonly redis: RedisService) {}

  publish(message: AgentTaskMessage) {
    return this.redis.publish("agent:tasks", {
      taskId:message.taskId,
      senderAgentId:message.senderAgentId,
      receiverAgentId:message.receiverAgentId,
      companyId:message.companyId,
      projectId:message.projectId ?? "",
      type:message.type,
      payload:JSON.stringify(message.payload),
    });
  }
}