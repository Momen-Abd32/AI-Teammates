import { Logger } from "@nestjs/common";
import { WebSocketGateway } from "@nestjs/websockets";
import type { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { AuthService } from "../auth/auth.service";
import { ActivityEvent, ActivityEventService } from "./activity.event.service";

type ActivitySocket=WebSocket & {companyId?:string;employeeId?:string;agentId?:string};

@WebSocketGateway({path:"/api/activity"})
export class ActivityGateway {
  private readonly logger=new Logger(ActivityGateway.name);
  private readonly clients=new Set<ActivitySocket>();
  private unsubscribe:()=>boolean=()=>false;

  constructor(private readonly auth:AuthService,events:ActivityEventService){
    this.unsubscribe=events.subscribe(event=>this.broadcast(event));
  }

  handleConnection(client:ActivitySocket,request:IncomingMessage){
    try{
      const url=new URL(request.url??"/","http://localhost");
      const token=url.searchParams.get("token");
      if(!token) return client.close(1008,"Authentication required");
      const user=this.auth.validate(token);
      client.companyId=user.companyId;
      client.employeeId=user.employeeId;
      this.clients.add(client);
      client.on("close",()=>this.clients.delete(client));
      client.on("error",()=>this.clients.delete(client));
      client.send(JSON.stringify({type:"activity.connected",timestamp:new Date().toISOString()}));
    }catch(error){
      this.logger.warn("Rejected activity websocket connection");
      client.close(1008,"Invalid session");
    }
  }

  private broadcast(event:ActivityEvent){
    const payload=JSON.stringify(event);
    for(const client of this.clients){
      if(client.readyState!==1){this.clients.delete(client);continue;}
      if(client.companyId!==event.companyId || client.employeeId!==event.employeeId) continue;
      if(client.agentId && client.agentId!==event.agentId) continue;
      client.send(payload);
    }
  }

  onModuleDestroy(){
    this.unsubscribe();
    for(const client of this.clients) client.close();
    this.clients.clear();
  }
}
