import { Module } from "@nestjs/common";
import { TaskDependencyController } from "./task-dependency.controller";
import { TaskDependencyRepository } from "./task-dependency.repository";
@Module({controllers:[TaskDependencyController],providers:[TaskDependencyRepository]})
export class TaskDependencyModule {}