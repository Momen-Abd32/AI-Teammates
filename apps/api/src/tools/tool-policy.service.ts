import {ForbiddenException,Injectable,NotFoundException}from "@nestjs/common";
import {OrganizationService}from "../organization/organization.service";
import {PermissionService}from "../security/permission.service";
import {ToolRegistry}from "./tool.registry";
import {ToolDecision,ToolRequest}from "./tool.types";

@Injectable()
export class ToolPolicyService{
 constructor(private registry:ToolRegistry,private org:OrganizationService,private permissions:PermissionService){}

 async decide(input:ToolRequest):Promise<ToolDecision>{
  const tool=this.registry.get(input.name);
  if(!tool) throw new NotFoundException("Tool not registered");
  const agents=await this.org.agents(input.companyId);
  const agent=agents.find(a=>a.id===input.agentId);
  if(!agent||agent.employeeId!==input.employeeId) throw new ForbiddenException("Agent ownership check failed");
  try{this.permissions.assertWithPermissions(input.name,tool.permission,agent.permissions);}
  catch{throw new ForbiddenException(`Missing permission: ${tool.permission}`);}
  return {allowed:true,requiresApproval:tool.requiresApproval,reason:tool.requiresApproval?"Human approval required for this action":"Policy allows this action"};
 }
}
