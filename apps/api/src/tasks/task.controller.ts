import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { TaskService } from "./task.service";
import { TaskStatus } from "../domain";

@Controller("tasks")
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Get("company/:companyId")
  list(@Param("companyId") companyId: string) {
    return this.tasks.list(companyId);
  }

  @Post()
  create(@Body() body: {
    companyId: string;
    title: string;
    description?: string;
    projectId?: string;
    assignedAgentId?: string;
  }) {
    return this.tasks.create({ ...body, description: body.description ?? "" });
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() body: { status: TaskStatus }) {
    return this.tasks.updateStatus(id, body.status);
  }
}
