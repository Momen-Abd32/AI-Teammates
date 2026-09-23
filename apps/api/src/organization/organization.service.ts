import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrganizationRepository } from "./organization.repository";

@Injectable()
export class OrganizationService {
  constructor(private repo:OrganizationRepository) {}

  createCompany(name:string) {
    if(!name.trim()) throw new Error("Company name is required");
    return this.repo.createCompany(name.trim());
  }

  async createEmployee(b:{companyId:string;name:string;email:string;role:string}) {
    if(!b.companyId?.trim()) throw new NotFoundException("Company is required");
    if(!b.name?.trim()) throw new Error("Employee name is required");
    if(!b.email?.trim()) throw new Error("Employee email is required");
    const existing=await this.repo.employeeByEmail(b.email);
    if(existing) throw new ConflictException("Employee email is already registered");
    return this.repo.createEmployee(b.companyId,b.name.trim(),b.email.trim(),b.role);
  }

  async createAgent(b:{companyId:string;employeeId:string;role:string;systemInstructions?:string}) {
    const employee=await this.repo.employee(b.employeeId);
    if(!employee || employee.companyId!==b.companyId) {
      throw new NotFoundException("Employee not found in company");
    }
    return this.repo.createAgent(b.companyId,b.employeeId,b.role,b.systemInstructions ?? "");
  }

  employees(companyId:string) { return this.repo.employees(companyId); }
  agents(companyId:string) { return this.repo.agents(companyId); }
  agentsForEmployee(companyId:string,employeeId:string) { return this.repo.agentsForEmployee(companyId,employeeId); }
}