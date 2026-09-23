import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

export type ActivityEvent = {
  id:string;
  type:"agent.started"|"memory.retrieved"|"tool.started"|"tool.completed"|"agent.delegated"|"approval.required"|"agent.completed"|"agent.failed";
  companyId:string;
  employeeId:string;
  agentId:string;
  conversationId?:string;
  message?:string;
  timestamp:string;
};

@Injectable()
export class ActivityEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger=new Logger(ActivityEventService.name);
  private readonly publisher=new Redis(process.env.REDIS_URL??"redis://localhost:6379");
  private readonly subscriber=new Redis(process.env.REDIS_URL??"redis://localhost:6379");
  private listeners=new Set<(event:ActivityEvent)=>void>();

  async onModuleInit(){
    await this.subscriber.subscribe("agent-activity");
    this.subscriber.on("message",(_channel,payload)=>{
      try{
        const event=JSON.parse(payload) as ActivityEvent;
        for(const listener of this.listeners) listener(event);
      }catch(error){
        this.logger.warn("Invalid activity event",error instanceof Error?error.message:String(error));
      }
    });
  }

  async publish(input:Omit<ActivityEvent,"id"|"timestamp">){
    const event:ActivityEvent={...input,id:crypto.randomUUID(),timestamp:new Date().toISOString()};
    await this.publisher.publish("agent-activity",JSON.stringify(event));
    return event;
  }

  subscribe(listener:(event:ActivityEvent)=>void){
    this.listeners.add(listener);
    return ()=>this.listeners.delete(listener);
  }

  async onModuleDestroy(){
    await Promise.allSettled([this.publisher.quit(),this.subscriber.quit()]);
  }
}
