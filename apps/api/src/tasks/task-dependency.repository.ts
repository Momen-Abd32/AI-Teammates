import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";
@Injectable()
export class TaskDependencyRepository {
  constructor(private db:DatabaseService){}
  async add(taskId:string,dependsOnTaskId:string){
    if(taskId===dependsOnTaskId) throw new Error("A task cannot depend on itself");
    await this.db.query(`INSERT INTO task_dependencies(task_id,depends_on_task_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[taskId,dependsOnTaskId]);
    return {taskId,dependsOnTaskId};
  }
  async list(taskId:string){
    const r=await this.db.query(`SELECT task_id AS "taskId",depends_on_task_id AS "dependsOnTaskId" FROM task_dependencies WHERE task_id=$1`,[taskId]);
    return r.rows;
  }
}