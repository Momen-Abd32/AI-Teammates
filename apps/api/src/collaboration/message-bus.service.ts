import { Injectable } from '@nestjs/common';
export type AgentTaskMessage={taskId:string;senderAgentId:string;receiverAgentId:string;companyId:string;projectId?:string;type:'TASK_REQUEST'|'TASK_RESPONSE';payload:Record<string,unknown>};
@Injectable()
export class MessageBusService{
 private readonly streams=new Map<string,AgentTaskMessage[]>();
 publish(message:AgentTaskMessage){const s=this.streams.get(message.companyId)||[];s.push(message);this.streams.set(message.companyId,s);return {queued:true};}
 consume(companyId:string,agentId:string){return (this.streams.get(companyId)||[]).filter(x=>x.receiverAgentId===agentId);}
}