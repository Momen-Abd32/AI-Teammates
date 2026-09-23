import{Injectable,NotFoundException,ForbiddenException}from"@nestjs/common";
import{randomUUID}from"crypto";
import{Task,TaskStatus}from"../domain";
import{TaskRepository}from"../repositories/task.repository";

@Injectable()
export class TaskService{
 constructor(private repo:TaskRepository){}
 async create(input:Omit<Task,"id"|"status">&{status?:TaskStatus}){return this.repo.save({...input,id:randomUUID(),status:input.status??"TODO"});}
 list(companyId:string){return this.repo.findByCompany(companyId);}
 async getForCompany(id:string,companyId:string){const task=await this.repo.find(id);if(!task)throw new NotFoundException("Task not found");if(task.companyId!==companyId)throw new ForbiddenException("Task does not belong to company");return task;}
 async updateStatus(id:string,status:TaskStatus,companyId?:string){
  const task=await this.repo.find(id);
  if(!task)throw new NotFoundException("Task not found");
  if(companyId&&task.companyId!==companyId)throw new ForbiddenException("Task does not belong to company");
  task.status=status;
  return this.repo.save(task);
 }
}
