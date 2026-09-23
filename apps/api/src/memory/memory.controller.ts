import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { MemoryService } from "./memory.service";
import { MemoryScope } from "../domain";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("memory")
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  @Get(":agentId")
  list(
    @Param("agentId") agentId:string,
    @Query("scope") scope:MemoryScope|undefined,
    @CurrentUser() user:any,
  ){
    return this.memory.list(user.companyId,user.employeeId,agentId,scope);
  }

  @Post()
  create(
    @Body() b:{companyId:string;agentId:string;scope:MemoryScope;content:string},
    @CurrentUser() user:any,
  ){
    return this.memory.create(b,user.employeeId);
  }

  @Delete(":agentId/:id")
  delete(
    @Param("agentId") agentId:string,
    @Param("id") id:string,
    @CurrentUser() user:any,
  ){
    return this.memory.delete(user.companyId,user.employeeId,agentId,id);
  }

  @Post(":agentId/search")
  search(
    @Param("agentId") agentId:string,
    @Body() b:{query:string;limit?:number;scope?:MemoryScope},
    @CurrentUser() user:any,
  ){
    return this.memory.semanticSearch(user.companyId,user.employeeId,agentId,b.query,b.limit??5,b.scope);
  }
}