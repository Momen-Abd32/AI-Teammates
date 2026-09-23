import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { MemoryService } from "./memory.service";
import { MemoryScope } from "../domain";

@Controller("memory")
export class MemoryController {
  constructor(private memory:MemoryService) {}

  @Get(":agentId")
  list(@Param("agentId") id:string,@Query("scope") scope?:MemoryScope) {
    return this.memory.list(id,scope);
  }

  @Post()
  create(@Body() b:{companyId:string;agentId:string;scope:MemoryScope;content:string}) {
    return this.memory.create(b);
  }

  @Delete(":agentId/:id")
  delete(@Param("agentId") agentId:string,@Param("id") id:string) {
    return this.memory.delete(agentId,id);
  }

  @Post(":agentId/search")
  search(@Param("agentId") id:string,@Body() b:{embedding:number[];limit?:number}) {
    return this.memory.semanticSearch(id,b.embedding,b.limit ?? 5);
  }
}
