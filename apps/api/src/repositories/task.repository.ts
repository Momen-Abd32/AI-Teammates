import { Injectable } from "@nestjs/common";
import { Task } from "../domain";

@Injectable()
export class TaskRepository {
  private readonly rows = new Map<string, Task>();
  save(task: Task) { this.rows.set(task.id, task); return task; }
  findByCompany(companyId: string) { return [...this.rows.values()].filter(x => x.companyId === companyId); }
  find(id: string) { return this.rows.get(id); }
}
