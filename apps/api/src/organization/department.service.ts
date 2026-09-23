import { Injectable } from "@nestjs/common";
import { DepartmentRepository } from "./department.repository";
@Injectable()
export class DepartmentService {
  constructor(private repo:DepartmentRepository){}
  create(companyId:string,name:string){
    if(!name.trim()) throw new Error("Department name is required");
    return this.repo.create(companyId,name);
  }
  list(companyId:string){return this.repo.list(companyId);}
}