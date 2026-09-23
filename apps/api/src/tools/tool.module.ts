import{Module}from "@nestjs/common";
import{ToolController}from "./tool.controller";
import{ToolRegistry}from "./tool.registry";
import{ToolPolicyService}from "./tool-policy.service";
import{ToolExecutionService}from "./tool-execution.service";
import{ToolExecutionRepository}from "./tool-execution.repository";
import{ApprovalModule}from "../approvals/approval.module";
import{OrganizationModule}from "../organization/organization.module";
import{SandboxModule}from "../sandbox/sandbox.module";
@Module({imports:[ApprovalModule,OrganizationModule,SandboxModule],controllers:[ToolController],providers:[ToolRegistry,ToolPolicyService,ToolExecutionService,ToolExecutionRepository],exports:[ToolExecutionService,ToolRegistry]})
export class ToolModule{}
