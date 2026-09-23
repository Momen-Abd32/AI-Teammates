import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { DeviceService } from "./device.service";

@Controller("devices")
export class DeviceController {
  constructor(private readonly devices:DeviceService){}

  @Post("register")
  register(@Body() body:{name:string;platform:string;capabilities?:string[]},@CurrentUser() user:any) {
    return this.devices.register({companyId:user.companyId,employeeId:user.employeeId,...body});
  }

  @Get()
  list(@CurrentUser() user:any){return this.devices.list(user.companyId,user.employeeId);}

  @Patch(":id/revoke")
  revoke(@Param("id") id:string,@CurrentUser() user:any){return this.devices.revoke(id,user.companyId,user.employeeId);}

  @Post(":id/bind-agent")
  bind(@Param("id") deviceId:string,@Body() body:{agentId:string;permissions?:string[]},@CurrentUser() user:any){
    return this.devices.bind({companyId:user.companyId,employeeId:user.employeeId,deviceId,agentId:body.agentId,permissions:body.permissions});
  }

  @Post(":id/unbind-agent")
  unbind(@Param("id") deviceId:string,@Body() body:{agentId:string},@CurrentUser() user:any){
    return this.devices.unbind({companyId:user.companyId,employeeId:user.employeeId,deviceId,agentId:body.agentId});
  }

  @Post(":id/commands")
  command(@Param("id") deviceId:string,@Body() body:{agentId:string;action:string;arguments?:Record<string,unknown>},@CurrentUser() user:any){
    return this.devices.requestCommand({companyId:user.companyId,employeeId:user.employeeId,deviceId,agentId:body.agentId,action:body.action,arguments:body.arguments});
  }
}
