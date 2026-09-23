import {Body,Controller,Get,Param,Post}from "@nestjs/common";
import {CurrentUser}from "../auth/current-user.decorator";
import {ToolExecutionService}from "./tool-execution.service";
import {ToolRegistry}from "./tool.registry";

@Controller("tools")
export class ToolController{
 constructor(private tools:ToolRegistry,private executions:ToolExecutionService){}
 @Get() list(){return this.tools.list();}
 @Post("request") request(@Body()b:{agentId:string;taskId?:string;name:string;resource?:string;arguments?:Record<string,unknown>;reason?:string},@CurrentUser()user:any){
  return this.executions.request({...b,companyId:user.companyId,employeeId:user.employeeId,arguments:b.arguments??{}});
 }
 @Post("approve/:executionId/:approvalId") approve(@Param("executionId")executionId:string,@Param("approvalId")approvalId:string,@CurrentUser()user:any){return this.executions.approveAndExecute(executionId,approvalId,user.employeeId);}
 @Post("reject/:executionId/:approvalId") reject(@Param("executionId")executionId:string,@Param("approvalId")approvalId:string,@CurrentUser()user:any){return this.executions.reject(executionId,approvalId,user.employeeId);}
}
