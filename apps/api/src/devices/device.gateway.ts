import { Logger } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { createHash } from "crypto";
import { Server, WebSocket } from "ws";
import { DeviceRepository } from "./device.repository";

@WebSocketGateway({ path:"/device" })
export class DeviceGateway {
  @WebSocketServer() server!: Server;
  private readonly logger=new Logger(DeviceGateway.name);
  private sockets=new Map<string,WebSocket>();

  constructor(private readonly repo:DeviceRepository) {}

  async handleConnection(socket:WebSocket) {
    const url=(socket as any).url as string|undefined;
    const token=url ? new URL(url,"http://localhost").searchParams.get("token") : null;
    if(!token){socket.close(4001,"Device token required");return;}
    const tokenHash=createHash("sha256").update(token).digest("hex");
    const device=await this.repo.findByTokenHash(tokenHash);
    if(!device || device.status==="REVOKED"){socket.close(4003,"Invalid device credentials");return;}
    await this.repo.heartbeat(device.id);
    this.sockets.set(device.id,socket);
    socket.send(JSON.stringify({type:"DEVICE_CONNECTED",deviceId:device.id}));

    socket.on("message",async raw=>{
      try{
        const body=JSON.parse(String(raw)) as {type?:string;commandId?:string;status?:"COMPLETED"|"FAILED"|"REJECTED";result?:unknown};
        if(body.type!=="device.result" || !body.commandId || !body.status) return;
        const command=await this.repo.commandForDevice(body.commandId,device.id);
        if(!command) return;
        await this.repo.completeCommand(body.commandId,body.status,body.result);
      }catch(error){
        this.logger.warn("Invalid device message",error instanceof Error?error.message:String(error));
      }
    });
    socket.on("close",()=>this.sockets.delete(device.id));
  }

  async sendCommand(command:any) {
    const socket=this.sockets.get(command.deviceId);
    if(!socket || socket.readyState!==1) throw new Error("Device is offline");
    await this.repo.startCommand(command.id);
    socket.send(JSON.stringify({type:"DEVICE_COMMAND",command:{id:command.id,action:command.action,arguments:command.arguments}}));
  }

  disconnect(deviceId:string){this.sockets.get(deviceId)?.close(4000,"Device revoked");}
}
