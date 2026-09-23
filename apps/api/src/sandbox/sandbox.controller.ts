import{Body,Controller,Post,ForbiddenException}from "@nestjs/common";
import{SandboxService}from "./sandbox.service";
import{CurrentUser}from "../auth/current-user.decorator";
import{OrganizationService}from "../organization/organization.service";

@Controller("sandbox")
export class SandboxController{
 constructor(private sandbox:SandboxService,private org:OrganizationService){}
 @Post("execute")
 async execute(@Body()b:{agentId:string;language:string;code:string},@CurrentUser()user:any){
  const agents=await this.org.agents(user.companyId);
  const agent=agents.find(a=>a.id===b.agentId);
  if(!agent||agent.employeeId!==user.employeeId) throw new ForbiddenException("Agent ownership check failed");
  return this.sandbox.execute(b.agentId,b.language,b.code);
 }
}