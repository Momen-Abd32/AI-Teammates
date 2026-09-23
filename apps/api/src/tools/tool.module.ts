import{Module}from "@nestjs/common";
import{ToolController}from "./tool.controller";
import{ToolRegistry}from "./tool.registry";
import{ToolPolicyService}from "./tool-policy.service";
import{ToolExecutionService}from "./tool-execution.service";
import{ToolExecutionRepository}from "./tool-execution.repository";
import{ApprovalModule}from "../approvals/approval.module";
import{OrganizationModule}from "../organization/organization.module";
@Module({imports:[ApprovalModule,OrganizationModule],controllers:[ToolController],providers:[ToolRegistry,ToolPolicyService,ToolExecutionService,ToolExecutionRepository],exports:[ToolExecutionService,ToolRegistry]})
export class ToolModule{}
