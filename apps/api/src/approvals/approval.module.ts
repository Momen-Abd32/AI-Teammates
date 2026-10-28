
import { forwardRef, Module } from "@nestjs/common";
import { ApprovalController } from "./approval.controller";
import { ApprovalService } from "./approval.service";
import { OrganizationModule } from "../organization/organization.module";
import { ActivityModule } from "../activity/activity.module";
import { TaskModule } from "../tasks/task.module";
import { CollaborationModule } from "../collaboration/collaboration.module";
import { ToolModule } from "../tools/tool.module";
import { AgentModule } from "../agent/agent.module";

@Module({
  imports: [
    OrganizationModule,
    ActivityModule,
    TaskModule,
    forwardRef(() => CollaborationModule),
    forwardRef(() => ToolModule),
    forwardRef(() => AgentModule),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
