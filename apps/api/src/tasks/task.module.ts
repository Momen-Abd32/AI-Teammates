import {Module} from "@nestjs/common";
import {TaskController} from "./task.controller";
import {TaskService} from "./task.service";
import {TaskRepository} from "../repositories/task.repository";
@Module({controllers:[TaskController],providers:[TaskService,TaskRepository],exports:[TaskService]})
export class TaskModule {}