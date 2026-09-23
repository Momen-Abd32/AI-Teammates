import {Body,Controller,Get,Param,Post}from "@nestjs/common";
import {OrganizationService}from "./organization.service";
import {Roles}from "../auth/roles.decorator";
import {CurrentUser} from "../auth/current-user.decorator";
@Controller("organization")
export class OrganizationController{
 constructor(private org:OrganizationService){}
 @Roles("admin")
 @Post("companies") company(@Body()b:{name:string}){return this.org.createCompany(b.name);}
 @Roles("admin")
 @Post("employees") employee(@Body()b:{companyId:string;name:string;email:string;role:string}){return this.org.createEmployee(b);}
 @Roles("admin")
 @Post("agents") agent(@Body()b:{companyId:string;employeeId:string;role:string;systemInstructions?:string}){return this.org.createAgent(b);}
 @Post("my-agents") myAgents(@Body()b:{role:string;systemInstructions?:string},@CurrentUser()user:any){return this.org.createAgent({companyId:user.companyId,employeeId:user.employeeId,role:b.role,systemInstructions:b.systemInstructions});}
 @Get("companies/:companyId/employees") employees(@Param("companyId")id:string){return this.org.employees(id);}
 @Get("companies/:companyId/agents") agents(@Param("companyId")id:string){return this.org.agents(id);}
}