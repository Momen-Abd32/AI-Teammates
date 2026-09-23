import {Body,Controller,Delete,Get,Param,Post,Query} from "@nestjs/common";
import {MemoryService} from "./memory.service";
import {MemoryScope} from "../domain";
@Controller("memory")
export class MemoryController{
 constructor(private readonly memory:MemoryService){}
 @Get(":agentId") list(@Param("agentId") agentId:string,@Query("scope") scope?:MemoryScope){return this.memory.list(agentId,scope);}
 @Post() create(@Body() body:{companyId:string;agentId:string;scope:MemoryScope;content:string}){return this.memory.create(body);}
 @Delete(":agentId/:id") remove(@Param("agentId") agentId:string,@Param("id") id:string){return this.memory.delete(agentId,id);}
}