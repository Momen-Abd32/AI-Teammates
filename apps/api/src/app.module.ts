import {Module} from "@nestjs/common";
import {AgentModule} from "./agent/agent.module";
import {SecurityModule} from "./security/security.module";
import {HealthController} from "./health.controller";
import {MemoryModule} from "./memory/memory.module";
import {TaskModule} from "./tasks/task.module";
import {TaskDependencyModule} from "./tasks/task-dependency.module";
import {ApprovalModule} from "./approvals/approval.module";
import {AuditModule} from "./audit/audit.module";
import {TenantModule} from "./tenancy/tenant.module";
import {AuthModule} from "./auth/auth.module";
import {CollaborationModule} from "./collaboration/collaboration.module";
import {MessageModule} from "./collaboration/message.module";
import {RepositoryModule} from "./repositories/repository.module";
import {InfrastructureModule} from "./infrastructure/infrastructure.module";
import {SandboxModule} from "./sandbox/sandbox.module";
import {OrganizationModule} from "./organization/organization.module";
import {DepartmentModule} from "./organization/department.module";
import {ProjectModule} from "./projects/project.module";
import {E2EFlowModule} from "./e2e-flow/e2e-flow.module";
import {AuthGuard} from "./auth/auth.guard";
import {APP_GUARD} from "@nestjs/core";

@Module({
 imports:[InfrastructureModule,SecurityModule,AuditModule,TenantModule,AuthModule,RepositoryModule,
 AgentModule,MemoryModule,TaskModule,TaskDependencyModule,ApprovalModule,CollaborationModule,MessageModule,
 SandboxModule,OrganizationModule,DepartmentModule,ProjectModule,E2EFlowModule],
 controllers:[HealthController],providers:[{provide:APP_GUARD,useClass:AuthGuard}]
})
export class AppModule {}