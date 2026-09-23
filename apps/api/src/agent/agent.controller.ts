import { Body, Controller, Get, Post } from "@nestjs/common";
import { AgentService } from "./agent.service";

type ChatBody = {
  agentId: string;
  employeeId: string;
  companyId: string;
  role?: string;
  message: string;
};

@Controller("agents")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get("demo")
  demo() {
    return this.agentService.getDemoAgent();
  }

  @Post("chat")
  chat(@Body() body: ChatBody) {
    return this.agentService.chat(body);
  }
}
