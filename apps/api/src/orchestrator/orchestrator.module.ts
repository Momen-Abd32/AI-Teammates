import{Module}from"@nestjs/common";
import{OrchestratorController}from"./orchestrator.controller";
import{OrchestratorService}from"./orchestrator.service";
import{OrganizationModule}from"../organization/organization.module";
import{TaskModule}from"../tasks/task.module";
import{CollaborationModule}from"../collaboration/collaboration.module";import{AgentModule}from"../agent/agent.module";

@Module({
 imports:[OrganizationModule,TaskModule,CollaborationModule,AgentModule],
 controllers:[OrchestratorController],
 providers:[OrchestratorService],
 exports:[OrchestratorService],
})
export class OrchestratorModule{}
