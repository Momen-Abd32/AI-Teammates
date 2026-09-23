import { Body, Controller, Post } from "@nestjs/common";
import { AgentService } from "./agent.service";
import { CurrentUser } from "../auth/current-user.decorator";

type ChatBody = { agentId:string; message:string; conversationId?:string };

@Controller("agents")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("chat")
  chat(@Body() body:ChatBody,@CurrentUser() user:any) {
    return this.agentService.chat({
      ...body,
      employeeId:user.employeeId,
      companyId:user.companyId,
    });
  }

  @Post("act")
  act(@Body() body:{agentId:string;message:string},@CurrentUser() user:any) {
    return this.agentService.act({agentId:body.agentId,message:body.message,employeeId:user.employeeId,companyId:user.companyId});
  }

  @Post("plan")
  plan(@Body() body:{agentId:string;message:string},@CurrentUser() user:any) {
    return this.agentService.planTool({
      agentId:body.agentId,
      message:body.message,
      employeeId:user.employeeId,
      companyId:user.companyId,
    });
  }
}
