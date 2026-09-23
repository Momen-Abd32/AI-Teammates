import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Task, TaskStatus } from "../domain";

@Injectable()
export class TaskService {
  private readonly tasks = new Map<string, Task>();

  create(input: Omit<Task, "id" | "status"> & { status?: TaskStatus }) {
    const task: Task = {
      ...input,
      id: randomUUID(),
      status: input.status ?? "TODO",
    };
    this.tasks.set(task.id, task);
    return task;
  }

  list(companyId: string) {
    return [...this.tasks.values()].filter((task) => task.companyId === companyId);
  }

  updateStatus(id: string, status: TaskStatus) {
    const task = this.tasks.get(id);
    if (!task) throw new NotFoundException("Task not found");
    task.status = status;
    return task;
  }
}
