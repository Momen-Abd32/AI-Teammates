import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { TeamOrchestratorService } from "./team-orchestrator.service";

@Controller("orchestrator")
export class TeamOrchestratorController {
  constructor(private readonly teamOrchestrator: TeamOrchestratorService) {}

  @Post("team-run")
  run(
    @Body() body: { message: string; projectId?: string },
    @CurrentUser() user: any,
  ) {
    return this.teamOrchestrator.run({
      message: body.message,
      projectId: body.projectId,
      companyId: user.companyId,
      employeeId: user.employeeId,
    });
  }
}
