import { Body, Controller, Post } from "@nestjs/common";
import { AgentService } from "./agent.service";

type ChatBody = {
  agentId: string;
  employeeId: string;
  companyId: string;
  role?: string;
  message: string;\n  conversationId?: string;
};

@Controller("agents")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("chat")
  chat(@Body() body: ChatBody) {
    return this.agentService.chat(body);
  }
}
