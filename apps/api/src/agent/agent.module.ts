import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentRunRepository } from "./agent-run.repository";
import { SecurityModule } from "../security/security.module";
import { AuditModule } from "../audit/audit.module";
import { OrganizationModule } from "../organization/organization.module";
import { MemoryModule } from "../memory/memory.module";
import { ConversationModule } from "../conversations/conversation.module";
import { ActivityModule } from "../activity/activity.module";
import { ToolModule } from "../tools/tool.module";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";

@Module({
  imports:[InfrastructureModule,SecurityModule,AuditModule,OrganizationModule,MemoryModule,ConversationModule,ActivityModule,ToolModule],
  controllers:[AgentController],
  providers:[AgentService,AgentRunRepository],
  exports:[AgentService],
})
export class AgentModule {}
