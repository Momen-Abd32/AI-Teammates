import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Task, TaskStatus } from "../domain";
import { TaskRepository } from "../repositories/task.repository";

@Injectable()
export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  create(input: Omit<Task, "id" | "status"> & { status?: TaskStatus }) {
    const task: Task = { ...input, id: randomUUID(), status: input.status ?? "TODO" };
    return this.repo.save(task);
  }

  list(companyId: string) {
    return this.repo.findByCompany(companyId);
  }

  updateStatus(id: string, status: TaskStatus) {
    const task = this.repo.find(id);
    if (!task) throw new NotFoundException("Task not found");
    task.status = status;
    return this.repo.save(task);
  }
}
