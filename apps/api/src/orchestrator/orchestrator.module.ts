import { Module } from "@nestjs/common";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorService } from "./orchestrator.service";
import { TeamOrchestratorController } from "./team-orchestrator.controller";
import { TeamOrchestratorService } from "./team-orchestrator.service";
import { OrganizationModule } from "../organization/organization.module";
import { TaskModule } from "../tasks/task.module";
import { CollaborationModule } from "../collaboration/collaboration.module";
import { AgentModule } from "../agent/agent.module";
import { ProjectModule } from "../projects/project.module";

@Module({
  imports: [OrganizationModule, TaskModule, CollaborationModule, AgentModule, ProjectModule],
  controllers: [OrchestratorController, TeamOrchestratorController],
  providers: [OrchestratorService, TeamOrchestratorService],
  exports: [OrchestratorService, TeamOrchestratorService],
})
export class OrchestratorModule {}
