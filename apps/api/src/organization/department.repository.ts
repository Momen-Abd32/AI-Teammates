import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";
@Injectable()
export class DepartmentRepository {
  constructor(private db:DatabaseService){}
  async create(companyId:string,name:string){
    const r=await this.db.query(`INSERT INTO departments(id,company_id,name) VALUES(gen_random_uuid(),$1,$2) RETURNING id,company_id AS "companyId",name`,[companyId,name.trim()]);
    return r.rows[0];
  }
  async list(companyId:string){
    const r=await this.db.query(`SELECT id,company_id AS "companyId",name FROM departments WHERE company_id=$1 ORDER BY name`,[companyId]);
    return r.rows;
  }
}