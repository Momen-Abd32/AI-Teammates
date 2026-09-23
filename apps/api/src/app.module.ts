import {Module} from "@nestjs/common";
import {AgentModule} from "./agent/agent.module";
import {SecurityModule} from "./security/security.module";
import {HealthController} from "./health.controller";
import {MemoryModule} from "./memory/memory.module";
import {TaskModule} from "./tasks/task.module";
import {ApprovalModule} from "./approvals/approval.module";
import {AuditModule} from "./audit/audit.module";
import {TenantModule} from "./tenancy/tenant.module";
import {AuthModule} from "./auth/auth.module";
@Module({imports:[SecurityModule,AuditModule,TenantModule,AuthModule,AgentModule,MemoryModule,TaskModule,ApprovalModule],controllers:[HealthController]})
export class AppModule{}