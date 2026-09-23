import { Module } from "@nestjs/common";
import { DepartmentController } from "./department.controller";
import { DepartmentRepository } from "./department.repository";
import { DepartmentService } from "./department.service";
@Module({controllers:[DepartmentController],providers:[DepartmentRepository,DepartmentService],exports:[DepartmentService]})
export class DepartmentModule {}