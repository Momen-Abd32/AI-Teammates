import {Body,Controller,Get,Param,Post}from "@nestjs/common";
import {ModuleRef} from "@nestjs/core";
import {ToolRegistry}from "./tool.registry";
import {ToolExecutionService}from "./tool-execution.service";
import {CurrentUser}from "../auth/current-user.decorator";
import {AgentService}from "../agent/agent.service";

@Controller("tools")
export class ToolController{
 constructor(private tools:ToolRegistry,private executions:ToolExecutionService,private moduleRef:ModuleRef){}

 @Get() list(){return this.tools.list();}

 @Post("request") request(@Body()b:{agentId:string;taskId?:string;name:string;resource?:string;arguments?:Record<string,unknown>;reason?:string},@CurrentUser()user:any){
  return this.executions.request({...b,companyId:user.companyId,employeeId:user.employeeId,arguments:b.arguments??{}});
 }

 @Post("approve/:executionId/:approvalId")
 async approve(@Param("executionId")executionId:string,@Param("approvalId")approvalId:string,@CurrentUser()user:any){
  const result=await this.executions.approveAndExecute(executionId,approvalId,user.employeeId);
  const agentService=this.moduleRef.get(AgentService,{strict:false});
  if(agentService){
   const resumed=await agentService.resumeAfterApproval(executionId,true,result.result,user.companyId,user.employeeId);
   return resumed ?? result;
  }
  return result;
 }

 @Post("reject/:executionId/:approvalId")
 async reject(@Param("executionId")executionId:string,@Param("approvalId")approvalId:string,@CurrentUser()user:any){
  const result=await this.executions.reject(executionId,approvalId,user.employeeId);
  const agentService=this.moduleRef.get(AgentService,{strict:false});
  if(agentService){
   const resumed=await agentService.resumeAfterApproval(executionId,false,result.execution?.result,user.companyId,user.employeeId);
   return resumed ?? result;
  }
  return result;
 }
}
