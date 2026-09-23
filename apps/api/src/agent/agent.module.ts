import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { SecurityModule } from "../security/security.module";
import { AuditModule } from "../audit/audit.module";
import { OrganizationModule } from "../organization/organization.module";
import { MemoryModule } from "../memory/memory.module";
import { ConversationModule } from "../conversations/conversation.module";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports:[SecurityModule,AuditModule,OrganizationModule,MemoryModule,ConversationModule,ActivityModule],
  controllers:[AgentController],
  providers:[AgentService],
})
export class AgentModule {}
