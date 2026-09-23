import { Body,Controller,Get,Param,Post } from "@nestjs/common";
import { TaskDependencyRepository } from "./task-dependency.repository";
@Controller("tasks")
export class TaskDependencyController {
  constructor(private repo:TaskDependencyRepository){}
  @Post(":taskId/dependencies") add(@Param("taskId") taskId:string,@Body() b:{dependsOnTaskId:string}){return this.repo.add(taskId,b.dependsOnTaskId);}
  @Get(":taskId/dependencies") list(@Param("taskId") taskId:string){return this.repo.list(taskId);}
}